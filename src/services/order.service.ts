import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';
import logger from '../config/logger.config';
import { orderRepository } from '../repositories/order.repository';
import { CreateOrderInput, Tx } from '../types/order';
import { haversineKm } from '../helpers/geo.helper';

/**
 * Generates a unique order number: MBG-<timestamp><4-random-digits>
 */
function generateOrderNumber(): string {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MBG-${ts}${rand}`;
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
  async createOrder(userId: number, input: CreateOrderInput) {
    const {
      address_id,
      payment_method,
      voucher_code,
      shipping_method,
      shipping_cost = 0
    } = input;

    // 1. Verify user is verified
    const user = await orderRepository.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (!user.is_verified) {
      throw new AppError('Please verify your email before placing an order', 403);
    }

    // 2. Load cart
    const cart = await orderRepository.findCartWithItems(userId);
    if (!cart || cart.cart_items.length === 0) {
      throw new AppError('Your cart is empty', 400);
    }

    // 3. Validate delivery address (must belong to user)
    const address = await orderRepository.findAddressById(address_id, userId);
    if (!address) {
      throw new AppError('Delivery address not found', 404);
    }

    // 4. Pre-order global stock check across ALL warehouses
    for (const item of cart.cart_items) {
      const globalStock = await orderRepository.findGlobalStockByProduct(item.product_id);
      const total = globalStock._sum.stock ?? 0;
      if (total < item.quantity) {
        throw new AppError(
          `Insufficient global stock for "${item.product.name}". ` +
          `Available: ${total}, requested: ${item.quantity}`,
          400
        );
      }
    }

    // 5. Nearest warehouse routing
    //    Find the closest store that:
    //      a) has enough stock for ALL items in the cart, OR
    //      b) (fallback) is the geometrically nearest store within delivery range
    const stores = await orderRepository.findAllActiveStores();

    const userLat = Number(address.latitude);
    const userLon = Number(address.longitude);

    // Sort stores by distance to delivery address
    const storesWithDistance = stores
      .map((s) => ({
        ...s,
        distance_km: haversineKm(
          userLat, userLon,
          Number(s.latitude), Number(s.longitude)
        )
      }))
      .sort((a, b) => a.distance_km - b.distance_km);

    // Pick the nearest store that can fulfil all items
    let selectedStore: (typeof storesWithDistance)[0] | null = null;

    for (const store of storesWithDistance) {
      let canFulfil = true;
      for (const item of cart.cart_items) {
        const inv = await orderRepository.findStoreInventory(store.id, item.product_id);
        if (!inv || inv.stock < item.quantity) {
          canFulfil = false;
          break;
        }
      }
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
    const discounts = await orderRepository.findActiveDiscountsForStore(selectedStore.id, now);

    type LineItem = {
      product_id: number;
      quantity: number;
      unit_price: Prisma.Decimal;
      discount_amount: Prisma.Decimal;
      discount_id?: number;
      is_bogo_item: boolean;
      total_price: Prisma.Decimal;
    };

    const lineItems: LineItem[] = [];
    let subtotal = new Prisma.Decimal(0);
    let totalDiscount = new Prisma.Decimal(0);

    for (const item of cart.cart_items) {
      const unitPrice = item.product.price;
      let discountAmount = new Prisma.Decimal(0);
      let discountId: number | undefined;
      let is_bogo_item = false;

      // Find the best applicable discount for this product
      const applicable = discounts.filter(
        (d) => d.product_id === item.product_id || d.product_id === null
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
    let voucherId: number | undefined;
    let voucherDiscount = new Prisma.Decimal(0);
    let userVoucherId: number | undefined;

    if (voucher_code) {
      const voucher = await orderRepository.findVoucherByCode(voucher_code);
      if (!voucher) throw new AppError('Voucher not found or expired', 404);
      if (voucher.expired_at < now) throw new AppError('Voucher has expired', 400);

      const uv = await orderRepository.findUserVoucher(userId, voucher.id);
      if (!uv) throw new AppError('Voucher not available for your account', 400);

      if (voucher.usage_type === 'shipping') {
        // Apply towards shipping cost
        const shippingDec = new Prisma.Decimal(shipping_cost);
        if (voucher.discount_type === 'percentage') {
          voucherDiscount = shippingDec.mul(voucher.discount_value.div(100));
        } else {
          voucherDiscount = Prisma.Decimal.min(voucher.discount_value, shippingDec);
        }
      } else {
        // Apply towards subtotal
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
      userVoucherId = uv.id;
    }

    // 8. Grand total
    const shippingDec = new Prisma.Decimal(shipping_cost);
    const grandTotal = subtotal.add(shippingDec).sub(voucherDiscount).gt(0)
      ? subtotal.add(shippingDec).sub(voucherDiscount)
      : new Prisma.Decimal(0);

    // 9. Persist everything inside a transaction
    const order = await prisma.$transaction(async (tx: Tx) => {
      // Create the order
      const newOrder = await orderRepository.createOrder(
        {
          user_id: userId,
          store_id: selectedStore!.id,
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
            order_id: newOrder.id,
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

        // Deduct stock from selected store
        const inv = await orderRepository.findStoreInventory(
          selectedStore!.id,
          line.product_id,
          tx
        );

        await orderRepository.decrementStock(inv!.id, line.quantity, tx);

        await orderRepository.createStockJournal(
          {
            store_inventory_id: inv!.id,
            quantity: line.quantity,
            type: 'order_deduction',
            description: `Order ${newOrder.order_number}`,
            reference_id: newOrder.id
          },
          tx
        );
      }

      // Mark voucher as used
      if (userVoucherId) {
        await orderRepository.markVoucherUsed(userVoucherId, newOrder.id, tx);
      }

      // Clear cart
      await orderRepository.deleteCartItems(cart.id, tx);
      await orderRepository.deleteCart(cart.id, tx);

      return newOrder;
    });

    logger.info(`Order created: id=${order.id}, number=${order.order_number}, user=${userId}`);

    // Return full order with items
    return orderRepository.findOrderById(order.id);
  }
};
