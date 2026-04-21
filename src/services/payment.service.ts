import { orderRepository } from '../repositories/order.repository';
import { createSnapTransaction, mapMidtransStatus, verifyWebhookSignature } from '../helpers/midtrans.helper';
import { AppError } from '../utils/AppError';
import logger from '../config/logger.config';

// Order statuses that are already fully resolved — no re-processing needed.
const TERMINAL_STATUSES = ['processing', 'shipped', 'confirmed', 'cancelled'] as const;

export const paymentService = {
  async createPaymentUrl(orderId: number, userId: number) {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) throw new AppError('Order not found', 404);
    if (order.user_id !== userId) throw new AppError('Access denied', 403);
    if (order.status !== 'waiting_for_payment') {
      throw new AppError('Order is not waiting for payment', 400);
    }

    // Get order items for Midtrans
    const orderItems = await orderRepository.findOrderItemsByOrderId(orderId);
    const items = orderItems.map((item) => ({
      id: String(item.product_id),
      name: item.product?.name || 'Product',
      price: Number(item.price),
      quantity: item.quantity,
    }));

    // Get user info
    const user = await orderRepository.findUserById(userId);

    // Create Midtrans Snap transaction
    const midtransResponse = await createSnapTransaction({
      order_id: order.order_number,
      order_number: order.order_number,
      gross_amount: Number(order.total_price),
      customer: {
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
      },
      items,
    });

    // Persist Midtrans details on the order
    const updatedOrder = await orderRepository.updatePaymentDetails(orderId, {
      midtrans_order_id: midtransResponse.transaction_id,
      payment_url: midtransResponse.redirect_url,
      midtrans_status: 'pending',
    });

    logger.info(`Payment URL created for order ${order.order_number}`);
    return {
      order: updatedOrder,
      payment_url: midtransResponse.redirect_url,
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

    // Find order by order_number (Midtrans sends order_number as order_id)
    const order = await orderRepository.findOrderByOrderNumber(order_id);
    if (!order) {
      logger.warn('Order not found for Midtrans notification', { order_id });
      return { success: false, message: 'Order not found' };
    }

    // BUG FIX: Idempotency guard — don't re-process if order is already in a terminal state.
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

  async getPaymentStatus(orderId: number, userId: number) {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) throw new AppError('Order not found', 404);
    if (order.user_id !== userId) throw new AppError('Access denied', 403);

    return {
      order_id: order.order_number,
      status: order.status,
      midtrans_status: order.midtrans_status,
      payment_url: order.payment_url,
    };
  },
};