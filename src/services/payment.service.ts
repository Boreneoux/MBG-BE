import { orderRepository } from '../repositories/order.repository';
import { createSnapTransaction, mapMidtransStatus, verifyWebhookSignature, getTransactionStatus } from '../helpers/midtrans.helper';
import { AppError } from '../utils/AppError';
import logger from '../config/logger.config';

// Order statuses that are already fully resolved — no re-processing needed.
const TERMINAL_STATUSES = ['processing', 'shipped', 'confirmed', 'cancelled'] as const;

export const paymentService = {
  async createPaymentUrl(orderNumber: string, userId: string) {
    const order = await orderRepository.findOrderByOrderNumber(orderNumber);
    if (!order) throw new AppError('Order not found', 404);
    if (order.user_id !== userId) throw new AppError('Access denied', 403);
    if (order.status !== 'waiting_for_payment') {
      throw new AppError('Order is not waiting for payment', 400);
    }

    // Get order items for Midtrans
    const orderItems = await orderRepository.findOrderItemsByOrderId(order.id);
    const items = orderItems.map((item) => ({
      id: String(item.product_id),
      name: item.product?.name || 'Product',
      price: Number(item.price),
      quantity: item.quantity,
    }));

    // Get user info
    const user = await orderRepository.findUserById(userId);

    // Create Midtrans Snap transaction with a unique order_id to avoid "transaction already exists" errors on retry.
    // We append a timestamp to the order_number.
    const midtransOrderId = `${order.order_number}-${Date.now()}`;

    // Add shipping cost and discounts as separate items so gross_amount matches the sum of items.
    const midtransItems = [...items];

    if (Number(order.shipping_cost) > 0) {
      midtransItems.push({
        id: 'SHIPPING',
        name: `Shipping (${order.shipping_method || 'Standard'})`,
        price: Number(order.shipping_cost),
        quantity: 1,
      });
    }

    if (Number(order.total_discount) > 0) {
      midtransItems.push({
        id: 'DISCOUNT',
        name: 'Discounts & Vouchers',
        price: -Number(order.total_discount),
        quantity: 1,
      });
    }

    const midtransResponse = await createSnapTransaction({
      order_id: midtransOrderId,
      order_number: order.order_number,
      gross_amount: Number(order.total_price),
      customer: {
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
      },
      items: midtransItems,
    });

    // Persist Midtrans details on the order (store the suffixed order_id so we can look it up later)
    const updatedOrder = await orderRepository.updatePaymentDetails(order.id, {
      midtrans_order_id: midtransOrderId,
      payment_url: midtransResponse.redirect_url,
      midtrans_status: 'pending',
    });

    logger.info(`Payment URL and Snap Token created for order ${order.order_number}`);
    return {
      order: updatedOrder,
      payment_url: midtransResponse.redirect_url,
      snap_token: midtransResponse.token,
    };
  },

  async handlePaymentNotification(notification: any) {
    const { order_id, transaction_status, gross_amount, signature_key, status_code } = notification;

    // Verify signature in production
    if (process.env.MIDTRANS_IS_PRODUCTION === 'true') {
      const isValid = verifyWebhookSignature(
        order_id,
        status_code,
        gross_amount,
        signature_key
      );
      if (!isValid) {
        logger.warn('Invalid Midtrans webhook signature', { order_id });
        // Return 200 so Midtrans does NOT retry — we explicitly reject bad signatures.
        return { success: false, message: 'Invalid webhook signature' };
      }
    }

    // Find order by order_number. Midtrans sends the suffixed order_id (e.g. MBG-XXXX-1714...).
    // We extract the original order_number by splitting at the last dash.
    const orderNumber = order_id.includes('-') && order_id.split('-').length > 2
      ? order_id.split('-').slice(0, 2).join('-') // MBG-XXXX
      : order_id;

    const order = await orderRepository.findOrderByOrderNumber(orderNumber);
    if (!order) {
      logger.warn('Order not found for Midtrans notification', { order_id, parsed_order_number: orderNumber });
      return { success: false, message: 'Order not found' };
    }

    // Idempotency guard — don't re-process if order is already in a terminal state.
    if ((TERMINAL_STATUSES as readonly string[]).includes(order.status)) {
      logger.info(`Skipping webhook for order ${order.order_number} — already in status: ${order.status}`);
      return { success: true, message: 'Already processed' };
    }

    // Map Midtrans status to our order status
    const newStatus = mapMidtransStatus(transaction_status);

    // Always persist the latest Midtrans status
    await orderRepository.updatePaymentDetails(order.id, {
      midtrans_status: transaction_status,
      midtrans_transaction_id: notification.transaction_id || '',
    });

    if (newStatus === 'processing') {
      // Payment confirmed by Midtrans → move to waiting_for_confirmation (admin then approves)
      await orderRepository.confirmPayment(order.id);
      logger.info(`Payment confirmed by Midtrans for order ${order.order_number}`);
    } else if (newStatus === 'cancelled') {
      await orderRepository.cancelOrder(order.id);
      logger.info(`Payment cancelled/expired for order ${order.order_number}`);
    }

    return { success: true, message: 'Notification processed' };
  },

  async getPaymentStatus(orderNumber: string, userId: string) {
    const order = await orderRepository.findOrderByOrderNumber(orderNumber);
    if (!order) throw new AppError('Order not found', 404);
    if (order.user_id !== userId) throw new AppError('Access denied', 403);

    return {
      order_id: order.order_number,
      status: order.status,
      midtrans_status: order.midtrans_status,
      payment_url: order.payment_url,
    };
  },

  /**
   * Actively queries the Midtrans API to get the real transaction status,
   * then syncs the order status in our DB accordingly.
   *
   * This is the local-dev-friendly alternative to relying on webhooks
   * (Midtrans cannot reach localhost, so webhooks never fire in dev).
   *
   * Called by the frontend after the Snap popup closes successfully.
   */
  async syncPaymentStatus(orderNumber: string, userId: string, isAdmin: boolean = false) {
    const order = await orderRepository.findOrderByOrderNumber(orderNumber);
    if (!order) throw new AppError('Order not found', 404);
    if (!isAdmin && order.user_id !== userId) throw new AppError('Access denied', 403);

    // Only sync if the order is still waiting for payment
    if (order.status !== 'waiting_for_payment') {
      return { synced: false, status: order.status, message: 'No sync needed' };
    }

    // We need the Midtrans order_id (which we stored with a timestamp suffix)
    const midtransOrderId = order.midtrans_order_id;
    if (!midtransOrderId) {
      return { synced: false, status: order.status, message: 'No Midtrans transaction found' };
    }

    let midtransData: any;
    try {
      midtransData = await getTransactionStatus(midtransOrderId);
    } catch (err) {
      logger.warn(`Failed to fetch Midtrans status for order ${order.order_number}`, { err });
      return { synced: false, status: order.status, message: 'Could not reach Midtrans' };
    }

    const transactionStatus: string = midtransData.transaction_status ?? 'pending';
    const newStatus = mapMidtransStatus(transactionStatus);

    // Persist the Midtrans status
    await orderRepository.updatePaymentDetails(order.id, {
      midtrans_status: transactionStatus,
      midtrans_transaction_id: midtransData.transaction_id ?? '',
    });

    if (newStatus === 'processing') {
      await orderRepository.confirmPayment(order.id);
      logger.info(`[sync] Payment confirmed for order ${order.order_number} (midtrans: ${transactionStatus})`);
      return { synced: true, status: 'waiting_for_confirmation', message: 'Payment confirmed' };
    }

    if (newStatus === 'cancelled') {
      await orderRepository.cancelOrder(order.id);
      logger.info(`[sync] Order cancelled for order ${order.order_number} (midtrans: ${transactionStatus})`);
      return { synced: true, status: 'cancelled', message: 'Payment cancelled' };
    }

    return { synced: false, status: order.status, message: `Midtrans status: ${transactionStatus}` };
  },
};
