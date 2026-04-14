import { Prisma, payment_method } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';
import { Tx } from '../types/order';

type Db = Tx | typeof prisma;

// ─── Repository ───────────────────────────────────────────────────────────────

export const orderRepository = {
  // ── Cart ────────────────────────────────────────────────────────────────────

  findCartWithItems(userId: number, db: Db = prisma) {
    return db.cart.findUnique({
      where: { user_id: userId },
      include: {
        cart_items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, weight: true }
            }
          }
        },
        store: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            max_delivery_distance: true
          }
        }
      }
    });
  },

  // ── Address ─────────────────────────────────────────────────────────────────

  findAddressById(addressId: number, userId: number, db: Db = prisma) {
    return db.userAddress.findFirst({
      where: { id: addressId, user_id: userId, deleted_at: null },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        address: true,
        city_id: true,
        province_id: true
      }
    });
  },

  // ── Stores ──────────────────────────────────────────────────────────────────

  findAllActiveStores(db: Db = prisma) {
    return db.store.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        max_delivery_distance: true
      }
    });
  },

  // ── Inventory ───────────────────────────────────────────────────────────────

  /** Returns total stock for a product across ALL warehouses */
  findGlobalStockByProduct(productId: number, db: Db = prisma) {
    return db.storeInventory.aggregate({
      where: { product_id: productId, deleted_at: null },
      _sum: { stock: true }
    });
  },

  /** Returns stock for a specific product in a specific store */
  findStoreInventory(storeId: number, productId: number, db: Db = prisma) {
    return db.storeInventory.findUnique({
      where: { store_id_product_id: { store_id: storeId, product_id: productId } },
      select: { id: true, stock: true }
    });
  },

  decrementStock(inventoryId: number, quantity: number, db: Db = prisma) {
    return db.storeInventory.update({
      where: { id: inventoryId },
      data: { stock: { decrement: quantity } }
    });
  },

  createStockJournal(
    data: {
      store_inventory_id: number;
      quantity: number;
      type: 'order_deduction';
      description?: string;
      reference_id?: number;
    },
    db: Db = prisma
  ) {
    return db.stockJournal.create({ data });
  },

  // ── Voucher ─────────────────────────────────────────────────────────────────

  findVoucherByCode(code: string, db: Db = prisma) {
    return db.voucher.findFirst({
      where: { code, deleted_at: null }
    });
  },

  findUserVoucher(userId: number, voucherId: number, db: Db = prisma) {
    return db.userVoucher.findFirst({
      where: { user_id: userId, voucher_id: voucherId, is_used: false, deleted_at: null }
    });
  },

  markVoucherUsed(userVoucherId: number, orderId: number, db: Db = prisma) {
    return db.userVoucher.update({
      where: { id: userVoucherId },
      data: { is_used: true, used_at: new Date(), order_id: orderId }
    });
  },

  // ── Discount ─────────────────────────────────────────────────────────────────

  findActiveDiscountsForStore(storeId: number, now: Date, db: Db = prisma) {
    return db.discount.findMany({
      where: {
        store_id: storeId,
        is_active: true,
        deleted_at: null,
        OR: [{ started_at: null }, { started_at: { lte: now } }],
        AND: [{ OR: [{ expired_at: null }, { expired_at: { gte: now } }] }]
      }
    });
  },

  // ── Order ────────────────────────────────────────────────────────────────────

  createOrder(
    data: {
      user_id: number;
      store_id: number;
      order_number: string;
      total_price: Prisma.Decimal | number;
      total_discount: Prisma.Decimal | number;
      shipping_cost: Prisma.Decimal | number;
      shipping_method?: string;
      address_id: number;
      voucher_id?: number;
      payment_method: payment_method;
      payment_deadline: Date;
    },
    db: Db = prisma
  ) {
    return db.order.create({ data });
  },

  createOrderItem(
    data: {
      order_id: number;
      product_id: number;
      quantity: number;
      price: Prisma.Decimal | number;
      discount_amount: Prisma.Decimal | number;
      discount_id?: number;
      is_bogo_item: boolean;
      total_price: Prisma.Decimal | number;
    },
    db: Db = prisma
  ) {
    return db.orderItem.create({ data });
  },

  findOrderById(orderId: number, db: Db = prisma) {
    return db.order.findUnique({
      where: { id: orderId },
      include: {
        order_items: {
          include: {
            product: { select: { id: true, name: true } },
            discount: { select: { id: true, type: true, value: true } }
          }
        },
        address: true,
        store: { select: { id: true, name: true } }
      }
    });
  },

  // ── Cart cleanup ─────────────────────────────────────────────────────────────

  deleteCartItems(cartId: number, db: Db = prisma) {
    return db.cartItem.deleteMany({ where: { cart_id: cartId } });
  },

  deleteCart(cartId: number, db: Db = prisma) {
    return db.cart.delete({ where: { id: cartId } });
  },

  // ── User ─────────────────────────────────────────────────────────────────────

  findUserById(userId: number, db: Db = prisma) {
    return db.user.findUnique({
      where: { id: userId },
      select: { id: true, is_verified: true }
    });
  }
};
