import crypto from 'crypto';
import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';
import logger from '../config/logger.config';
import { orderRepository } from '../repositories/order.repository';
import { CreateOrderInput, Tx } from '../types/order';
import { haversineKm } from '../helpers/geo.helper';

/**
 * Generates a unique order number: MBG-<8 random hex chars (upper)>
 * Uses crypto.randomBytes so collisions are astronomically unlikely,
 * removing the need for a timestamp which could repeat under concurrency.
 */
function generateOrderNumber(): string {
  return `MBG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * Payment deadline — 1 hour from now.
 */
function buildPaymentDeadline(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  return d;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const orderService = {
  async createOrder(userId: string, input: CreateOrderInput) {
    const {
      address_id,
      payment_method,
      voucher_code,
      shipping_method,
      shipping_cost,
      cart_item_ids
    } = input;

    if (payment_method !== 'payment_gateway') {
      throw new AppError('payment_method must be payment_gateway', 400);
    }

    // shipping_cost is required when a shipping method is provided;
    // default to 0 only for in-store / pickup orders (no shipping_method)
    const resolvedShippingCost =
      shipping_method && !shipping_cost
        ? (() => {
            throw new AppError(
              'shipping_cost is required when shipping_method is set',
              400
            );
          })()
        : (shipping_cost ?? 0);

    // 1. Verify user is verified
    const user = await orderRepository.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (!user.is_verified) {
      throw new AppError(
        'Please verify your email before placing an order',
        403
      );
    }

    // 2. Load cart and filter items if cart_item_ids provided
    const cart = await orderRepository.findCartWithItems(userId);
    if (!cart || cart.cart_items.length === 0) {
      throw new AppError('Your cart is empty', 400);
    }

    let itemsToProcess = cart.cart_items;
    if (cart_item_ids && cart_item_ids.length > 0) {
      itemsToProcess = cart.cart_items.filter(item =>
        cart_item_ids.includes(item.id)
      );
      if (itemsToProcess.length === 0) {
        throw new AppError('No valid cart items selected', 400);
      }
    }

    // 3. Validate delivery address (must belong to user)
    const address = await orderRepository.findAddressById(address_id, userId);
    if (!address) {
      throw new AppError('Delivery address not found', 404);
    }

    // 4. Pre-order global stock check — single groupBy query, no N+1
    const cartProductIds = itemsToProcess.map(i => i.product_id);
    const globalStockMap =
      await orderRepository.findGlobalStockByProducts(cartProductIds);

    for (const item of itemsToProcess) {
      const total = globalStockMap.get(item.product_id) ?? 0;
      if (total < item.quantity) {
        throw new AppError(
          `Insufficient global stock for "${item.product.name}". ` +
            `Available: ${total}, requested: ${item.quantity}`,
          400
        );
      }
    }

    // 5. Nearest warehouse routing
    //    Find the closest store that has enough stock for ALL items in the cart.
    const stores = await orderRepository.findAllActiveStores();

    const userLat = Number(address.latitude);
    const userLon = Number(address.longitude);

    // Sort stores by distance to delivery address
    const storesWithDistance = stores
      .map(s => ({
        ...s,
        distance_km: haversineKm(
          userLat,
          userLon,
          Number(s.latitude),
          Number(s.longitude)
        )
      }))
      .sort((a, b) => a.distance_km - b.distance_km);

    // Bulk-fetch all inventories for every store × product in one query (no N+1)
    const productIds = itemsToProcess.map(i => i.product_id);
    const storeIds = storesWithDistance.map(s => s.id);
    const inventoryMap = await orderRepository.findInventoriesBulk(
      storeIds,
      productIds
    );

    // Pick the nearest store that can fulfil all items using the in-memory map
    let selectedStore: (typeof storesWithDistance)[0] | null = null;

    for (const store of storesWithDistance) {
      const canFulfil = itemsToProcess.every(item => {
        const inv = inventoryMap.get(`${store.id}:${item.product_id}`);
        return inv && inv.stock >= item.quantity;
      });
      if (canFulfil) {
        selectedStore = store;
        break;
      }
    }

    if (!selectedStore) {
      throw new AppError(
        'No single warehouse can fulfil all items. Please adjust your cart quantities.',
        400
      );
    }

    logger.info(
      `Order routing: user=${userId} → store=${selectedStore.id} (${selectedStore.distance_km.toFixed(2)} km)`
    );

    // 6. Compute totals with active discounts
    const now = new Date();
    const discounts = await orderRepository.findActiveDiscountsForStore(
      selectedStore.id,
      now
    );

    type LineItem = {
      product_id: string;
      quantity: number;
      unit_price: Prisma.Decimal;
      discount_amount: Prisma.Decimal;
      discount_id?: string;
      is_bogo_item: boolean;
      total_price: Prisma.Decimal;
    };

    const lineItems: LineItem[] = [];
    let subtotal = new Prisma.Decimal(0);
    let totalDiscount = new Prisma.Decimal(0);

    for (const item of itemsToProcess) {
      const unitPrice = item.product.price;
      let discountAmount = new Prisma.Decimal(0);
      let discountId: string | undefined;
      let is_bogo_item = false;

      // Find the best applicable discount for this product
      const applicable = discounts.filter(
        d => d.product_id === item.product_id || d.product_id === null
      );

      for (const d of applicable) {
        if (d.type === 'buy_one_get_one') {
          // BOGO: every pair → one unit is free
          const freeQty = Math.floor(item.quantity / 2);
          const bogoDiscount = unitPrice.mul(freeQty);
          if (bogoDiscount.gt(discountAmount)) {
            discountAmount = bogoDiscount;
            discountId = d.id;
            is_bogo_item = true;
          }
        } else if (d.type === 'percentage' && d.value) {
          const pct = d.value.div(100);
          let pctDiscount = unitPrice.mul(item.quantity).mul(pct);
          if (d.max_discount_value) {
            pctDiscount = Prisma.Decimal.min(pctDiscount, d.max_discount_value);
          }
          if (pctDiscount.gt(discountAmount)) {
            discountAmount = pctDiscount;
            discountId = d.id;
            is_bogo_item = false;
          }
        } else if (d.type === 'nominal' && d.value) {
          if (d.value.gt(discountAmount)) {
            discountAmount = d.value;
            discountId = d.id;
            is_bogo_item = false;
          }
        }
      }

      const itemTotal = unitPrice.mul(item.quantity).sub(discountAmount);
      subtotal = subtotal.add(itemTotal);
      totalDiscount = totalDiscount.add(discountAmount);

      lineItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        discount_amount: discountAmount,
        discount_id: discountId,
        is_bogo_item,
        total_price: itemTotal
      });
    }

    // 7. Resolve voucher
    let voucherId: string | undefined;
    let voucherDiscount = new Prisma.Decimal(0);
    let userVoucherId: string | undefined;

    if (voucher_code) {
      const voucher = await orderRepository.findVoucherByCode(voucher_code);
      if (!voucher) throw new AppError('Voucher not found or expired', 404);

      const uv = await orderRepository.findUserVoucher(userId, voucher.id);

      if (voucher.is_referral || voucher.is_referrer_reward) {
        // User-specific: must be explicitly assigned and unused
        if (!uv) throw new AppError('Voucher not available for your account', 400);
        if (uv.is_used) throw new AppError('You have already used this voucher', 400);
      } else {
        // General promotion: only block if already used
        if (uv && uv.is_used) throw new AppError('You have already used this voucher', 400);
      }

      const effectiveExpiry = uv?.expired_at ?? voucher.expired_at;
      if (effectiveExpiry < now) throw new AppError('Voucher has expired', 400);

      if (voucher.usage_type === 'shipping') {
        const shippingDec = new Prisma.Decimal(resolvedShippingCost);
        if (voucher.discount_type === 'percentage') {
          voucherDiscount = shippingDec.mul(voucher.discount_value.div(100));
        } else {
          voucherDiscount = Prisma.Decimal.min(voucher.discount_value, shippingDec);
        }
      } else {
        if (voucher.min_purchase_amount && subtotal.lt(voucher.min_purchase_amount)) {
          throw new AppError(
            `Minimum purchase amount for this voucher is ${voucher.min_purchase_amount}`,
            400
          );
        }
        if (voucher.discount_type === 'percentage') {
          voucherDiscount = subtotal.mul(voucher.discount_value.div(100));
          if (voucher.max_discount_amount) {
            voucherDiscount = Prisma.Decimal.min(voucherDiscount, voucher.max_discount_amount);
          }
        } else {
          voucherDiscount = voucher.discount_value;
        }
      }

      totalDiscount = totalDiscount.add(voucherDiscount);
      voucherId = voucher.id;
      userVoucherId = uv?.id; // undefined for general promotion vouchers
    }

    // 8. Grand total
    const shippingDec = new Prisma.Decimal(resolvedShippingCost);
    const rawTotal = subtotal.add(shippingDec).sub(voucherDiscount);
    const grandTotal = rawTotal.gt(0) ? rawTotal : new Prisma.Decimal(0);

    // 9. Persist everything inside a transaction.
    // Retry up to 3 times on order_number unique constraint collision (P2002).
    // With crypto.randomBytes(4) the odds of a collision are ~1 in 4 billion
    // per attempt, so this is purely a safety net.
    const cartId = cart.id;
    const storeId = selectedStore.id;
    let createdOrderId: string | undefined;
    let createdOrderNumber: string | undefined;

    const MAX_ORDER_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_ORDER_RETRIES; attempt++) {
      try {
        const newOrder = await prisma.$transaction(async (tx: Tx) => {
          const created = await orderRepository.createOrder(
            {
              user_id: userId,
              store_id: storeId,
              order_number: generateOrderNumber(),
              total_price: grandTotal,
              total_discount: totalDiscount,
              shipping_cost: shippingDec,
              shipping_method,
              address_id,
              voucher_id: voucherId,
              payment_method,
              payment_deadline: buildPaymentDeadline()
            },
            tx
          );

          // Create order items + deduct stock
          for (const line of lineItems) {
            await orderRepository.createOrderItem(
              {
                order_id: created.id,
                product_id: line.product_id,
                quantity: line.quantity,
                price: line.unit_price,
                discount_amount: line.discount_amount,
                discount_id: line.discount_id,
                is_bogo_item: line.is_bogo_item,
                total_price: line.total_price
              },
              tx
            );

            // Reuse inventory id from the routing pass — no extra query needed
            const inv = inventoryMap.get(`${storeId}:${line.product_id}`)!;

            await orderRepository.decrementStock(inv.id, line.quantity, tx);

            await orderRepository.createStockJournal(
              {
                store_inventory_id: inv.id,
                quantity: line.quantity,
                type: 'order_deduction',
                description: `Order ${created.order_number}`,
                reference_id: created.id
              },
              tx
            );
          }

          // Mark voucher as used
          if (voucherId) {
            if (userVoucherId) {
              // User-specific voucher: mark existing record as used
              await orderRepository.markVoucherUsed(userVoucherId, created.id, tx);
            } else {
              // General promotion voucher: create a UserVoucher record to prevent reuse
              await tx.userVoucher.create({
                data: {
                  user_id: userId,
                  voucher_id: voucherId,
                  order_id: created.id,
                  is_used: true,
                  used_at: new Date()
                }
              });
            }
          }

          // Clear processed items from cart
          const itemIdsProcessed = itemsToProcess.map(i => i.id);
          await tx.cartItem.deleteMany({
            where: { id: { in: itemIdsProcessed } }
          });

          // If cart is now empty, delete the cart itself
          const remainingItemsCount = await tx.cartItem.count({
            where: { cart_id: cartId }
          });

          if (remainingItemsCount === 0) {
            await orderRepository.deleteCart(cartId, tx);
          }

          return created;
        });

        createdOrderId = newOrder.id;
        createdOrderNumber = newOrder.order_number;
        break;
      } catch (err) {
        const isCollision =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          Array.isArray((err.meta as any)?.target) &&
          (err.meta as any).target.includes('order_number');
        if (isCollision && attempt < MAX_ORDER_RETRIES) {
          logger.warn(
            `order_number collision on attempt ${attempt}, retrying…`
          );
          continue;
        }
        throw err;
      }
    }

    logger.info(
      `Order created: id=${createdOrderId}, number=${createdOrderNumber}, user=${userId}`
    );

    // Return full order with items
    return orderRepository.findOrderById(createdOrderId!);
  },

  async getUserOrders(
    userId: string,
    page: number,
    limit: number,
    search?: string
  ) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      orderRepository.findUserOrders({ userId, search, skip, take: limit }),
      orderRepository.countUserOrders({ userId, search })
    ]);
    return {
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async getOrderForUser(userId: string, orderNumber: string) {
    const order = await orderRepository.findOrderByOrderNumber(orderNumber);
    if (!order) throw new AppError('Order not found', 404);
    if (order.user_id !== userId) throw new AppError('Forbidden', 403);
    return order;
  },

  async cancelExpiredOrders() {
    const now = new Date();
    const ordersToCancel = await orderRepository.findOrdersToCancel(now);

    if (ordersToCancel.length === 0) return 0;

    for (const order of ordersToCancel) {
      await orderRepository.cancelOrder(order.id);
      logger.info(
        `Auto-cancelled order ${order.order_number} due to payment deadline`
      );
    }

    return ordersToCancel.length;
  },

  async cancelOrder(userId: string, orderNumber: string) {
    const order = await orderRepository.findOrderByOrderNumber(orderNumber);
    if (!order) throw new AppError('Order not found', 404);
    if (order.user_id !== userId)
      throw new AppError('Forbidden: cannot cancel this order', 403);
    if (order.status !== 'waiting_for_payment') {
      throw new AppError(
        'Order can only be cancelled before payment upload',
        400
      );
    }

    const cancelled = await orderRepository.cancelOrder(order.id);
    logger.info(`Order cancelled by user ${userId}: ${order.order_number}`);
    return cancelled;
  },

  async confirmPayment(orderId: string, gatewayReference?: string) {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) throw new AppError('Order not found', 404);

    if (order.status !== 'waiting_for_payment') {
      throw new AppError('Order is not waiting for payment', 400);
    }

    const updatedOrder = await orderRepository.confirmPayment(orderId);
    logger.info(`Payment confirmed for order ${order.order_number}`);
    return updatedOrder;
  },

  async confirmReceipt(userId: string, orderNumber: string) {
    const order = await orderRepository.findOrderByOrderNumber(orderNumber);
    if (!order) throw new AppError('Order not found', 404);
    if (order.user_id !== userId)
      throw new AppError('Forbidden: cannot confirm this order', 403);
    if (order.status !== 'shipped') {
      throw new AppError('Order is not shipped yet', 400);
    }

    const updatedOrder = await orderRepository.confirmReceipt(order.id);
    logger.info(`Order receipt confirmed by customer: ${order.order_number}`);
    return updatedOrder;
  },

  async autoApprovePendingConfirmations() {
    const now = new Date();
    const orders = await orderRepository.findOrdersToAutoApprove(now);

    if (orders.length === 0) return 0;

    for (const order of orders) {
      await orderRepository.approvePayment(order.id);
      logger.info(
        `Auto-approved order ${order.order_number} after 7 days awaiting confirmation`
      );
    }

    return orders.length;
  },

  async autoConfirmShippedOrders() {
    const now = new Date();
    const orders = await orderRepository.findOrdersToAutoConfirmReceipt(now);

    if (orders.length === 0) return 0;

    for (const order of orders) {
      await orderRepository.confirmReceipt(order.id);
      logger.info(
        `Auto-confirmed receipt for order ${order.order_number} after shipped grace period`
      );
    }

    return orders.length;
  }
};
