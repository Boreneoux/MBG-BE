import { Prisma, payment_method } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';
import { Tx } from '../types/order';

type Db = Tx | typeof prisma;

// ─── Repository ───────────────────────────────────────────────────────────────

export const orderRepository = {
  // ── Cart ────────────────────────────────────────────────────────────────────

  findCartWithItems(userId: string, db: Db = prisma) {
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

  findAddressById(addressId: string, userId: string, db: Db = prisma) {
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

  async findGlobalStockByProducts(
    productIds: string[],
    db: Db = prisma
  ): Promise<Map<string, number>> {
    const rows = await db.storeInventory.groupBy({
      by: ['product_id'],
      where: { product_id: { in: productIds }, deleted_at: null },
      _sum: { stock: true }
    });
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.product_id, r._sum.stock ?? 0);
    }
    return map;
  },

  findStoreInventory(storeId: string, productId: string, db: Db = prisma) {
    return db.storeInventory.findUnique({
      where: {
        store_id_product_id: { store_id: storeId, product_id: productId }
      },
      select: { id: true, stock: true }
    });
  },

  async findInventoriesBulk(
    storeIds: string[],
    productIds: string[],
    db: Db = prisma
  ): Promise<Map<string, { id: string; stock: number }>> {
    const rows = await db.storeInventory.findMany({
      where: {
        store_id: { in: storeIds },
        product_id: { in: productIds },
        deleted_at: null
      },
      select: { id: true, store_id: true, product_id: true, stock: true }
    });
    const map = new Map<string, { id: string; stock: number }>();
    for (const r of rows) {
      map.set(`${r.store_id}:${r.product_id}`, { id: r.id, stock: r.stock });
    }
    return map;
  },

  decrementStock(inventoryId: string, quantity: number, db: Db = prisma) {
    return db.storeInventory.update({
      where: { id: inventoryId },
      data: { stock: { decrement: quantity } }
    });
  },

  incrementStock(inventoryId: string, quantity: number, db: Db = prisma) {
    return db.storeInventory.update({
      where: { id: inventoryId },
      data: { stock: { increment: quantity } }
    });
  },

  findStoreAdminByUserId(userId: string, db: Db = prisma) {
    return db.storeAdmin.findFirst({
      where: { user_id: userId, deleted_at: null },
      select: { store_id: true }
    });
  },

  createStockJournal(
    data: {
      store_inventory_id: string;
      quantity: number;
      type: 'order_deduction' | 'order_cancellation_return';
      description?: string;
      reference_id?: string;
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

  findUserVoucher(userId: string, voucherId: string, db: Db = prisma) {
    return db.userVoucher.findFirst({
      where: {
        user_id: userId,
        voucher_id: voucherId,
        is_used: false,
        deleted_at: null
      }
    });
  },

  markVoucherUsed(userVoucherId: string, orderId: string, db: Db = prisma) {
    return db.userVoucher.update({
      where: { id: userVoucherId },
      data: { is_used: true, used_at: new Date(), order_id: orderId }
    });
  },

  // ── Discount ─────────────────────────────────────────────────────────────────

  findActiveDiscountsForStore(storeId: string, now: Date, db: Db = prisma) {
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
      user_id: string;
      store_id: string;
      order_number: string;
      total_price: Prisma.Decimal | number;
      total_discount: Prisma.Decimal | number;
      shipping_cost: Prisma.Decimal | number;
      shipping_method?: string;
      address_id: string;
      voucher_id?: string;
      payment_method: payment_method;
      payment_deadline: Date;
    },
    db: Db = prisma
  ) {
    return db.order.create({ data });
  },

  createOrderItem(
    data: {
      order_id: string;
      product_id: string;
      quantity: number;
      price: Prisma.Decimal | number;
      discount_amount: Prisma.Decimal | number;
      discount_id?: string;
      is_bogo_item: boolean;
      total_price: Prisma.Decimal | number;
    },
    db: Db = prisma
  ) {
    return db.orderItem.create({ data });
  },

  findOrderById(orderId: string, db: Db = prisma) {
    return db.order.findUnique({
      where: { id: orderId },
      include: {
        order_items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                product_images: {
                  select: { id: true, image_url: true, is_primary: true },
                  orderBy: { is_primary: 'desc' },
                  take: 1
                }
              }
            },
            discount: { select: { id: true, type: true, value: true } }
          }
        },
        address: {
          include: {
            city: { select: { name: true } },
            province: { select: { name: true } },
            district: { select: { name: true } }
          }
        },
        store: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            city: { select: { name: true } }
          }
        }
      }
    });
  },

  findUserOrders(
    params: {
      userId: string;
      search?: string;
      date?: string;
      sortOrder?: 'asc' | 'desc';
      skip: number;
      take: number;
    },
    db: Db = prisma
  ) {
    const where: Prisma.OrderWhereInput = {
      user_id: params.userId,
      ...(params.search
        ? { order_number: { contains: params.search, mode: 'insensitive' } }
        : {})
    };

    if (params.date) {
      const startDate = new Date(`${params.date}T00:00:00.000Z`);
      const endDate = new Date(`${params.date}T23:59:59.999Z`);
      where.created_at = { gte: startDate, lte: endDate };
    }

    return db.order.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { created_at: params.sortOrder || 'desc' },
      include: {
        order_items: {
          include: {
            product: { select: { id: true, name: true } }
          }
        }
      }
    });
  },

  countUserOrders(
    params: { userId: string; search?: string; date?: string },
    db: Db = prisma
  ) {
    const where: Prisma.OrderWhereInput = {
      user_id: params.userId,
      ...(params.search
        ? { order_number: { contains: params.search, mode: 'insensitive' } }
        : {})
    };

    if (params.date) {
      const startDate = new Date(`${params.date}T00:00:00.000Z`);
      const endDate = new Date(`${params.date}T23:59:59.999Z`);
      where.created_at = { gte: startDate, lte: endDate };
    }

    return db.order.count({ where });
  },

  findOrdersForAdmin(
    params: {
      where: Prisma.OrderWhereInput;
      skip: number;
      take: number;
      orderBy: Prisma.OrderOrderByWithRelationInput;
    },
    db: Db = prisma
  ) {
    return db.order.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
      include: {
        order_items: {
          include: {
            product: { select: { id: true, name: true } },
            discount: { select: { id: true, type: true, value: true } }
          }
        },
        address: true,
        store: {
          select: { id: true, name: true, city: { select: { name: true } } }
        },
        user: {
          select: { id: true, first_name: true, last_name: true, email: true }
        }
      }
    });
  },

  countOrders(where: Prisma.OrderWhereInput, db: Db = prisma) {
    return db.order.count({ where });
  },

  cancelOrder(orderId: string, db: Db = prisma) {
    const isTx = !('$transaction' in db);

    const runInTx = async (tx: any) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { order_items: true }
      });

      if (!order) return null;
      if (order.status === 'cancelled') return order;

      for (const item of order.order_items) {
        const storeInventory = await tx.storeInventory.findUnique({
          where: {
            store_id_product_id: { store_id: order.store_id, product_id: item.product_id }
          }
        });

        if (storeInventory) {
          await tx.storeInventory.update({
            where: { id: storeInventory.id },
            data: { stock: { increment: item.quantity } }
          });

          await tx.stockJournal.create({
            data: {
              store_inventory_id: storeInventory.id,
              quantity: item.quantity,
              type: 'order_cancellation_return',
              description: `Order ${order.order_number} canceled and stock returned`,
              reference_id: order.id
            }
          });
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status: 'cancelled', cancelled_at: new Date() }
      });
    };

    if (isTx) {
      return runInTx(db);
    } else {
      return (db as typeof prisma).$transaction(runInTx);
    }
  },

  findOrdersToCancel(now: Date, db: Db = prisma) {
    return db.order.findMany({
      where: {
        status: 'waiting_for_payment',
        payment_deadline: { lt: now }
      },
      select: { id: true, order_number: true, user_id: true }
    });
  },

  /**
   * Find processing orders whose simulated shipment timer has elapsed.
   */
  findOrdersToAutoShip(now: Date, db: Db = prisma) {
    return db.order.findMany({
      where: {
        status: 'processing',
        shipped_simulate_at: { lte: now }
      },
      select: { id: true, order_number: true }
    });
  },

  /**
   * Find shipped orders that have not been confirmed within 7 days.
   * Auto-confirm these as "received".
   */
  findOrdersToAutoConfirmReceipt(now: Date, db: Db = prisma) {
    return db.order.findMany({
      where: {
        status: 'shipped',
        shipped_at: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
      },
      select: { id: true, order_number: true }
    });
  },

  /**
   * Find orders in waiting_for_confirmation state for 7+ days (auto-approve).
   */
  findOrdersToAutoApprove(now: Date, db: Db = prisma) {
    return db.order.findMany({
      where: {
        status: 'waiting_for_confirmation',
        updated_at: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
      },
      select: { id: true, order_number: true }
    });
  },

  confirmPayment(orderId: string, db: Db = prisma) {
    return db.order.update({
      where: { id: orderId },
      data: { status: 'waiting_for_confirmation' }
    });
  },

  /**
   * Move order to processing and set the simulated shipment time.
   */
  setProcessing(orderId: string, shippedSimulateAt: Date, db: Db = prisma) {
    return db.order.update({
      where: { id: orderId },
      data: { status: 'processing', shipped_simulate_at: shippedSimulateAt }
    });
  },

  approvePayment(orderId: string, db: Db = prisma) {
    return db.order.update({
      where: { id: orderId },
      data: { status: 'processing' }
    });
  },

  shipOrder(orderId: string, db: Db = prisma) {
    return db.order.update({
      where: { id: orderId },
      data: { status: 'shipped', shipped_at: new Date() }
    });
  },

  confirmReceipt(orderId: string, db: Db = prisma) {
    return db.order.update({
      where: { id: orderId },
      data: { status: 'confirmed', confirmed_at: new Date() }
    });
  },

  // ── Cart cleanup ─────────────────────────────────────────────────────────────

  deleteCartItems(cartId: string, db: Db = prisma) {
    return db.cartItem.deleteMany({ where: { cart_id: cartId } });
  },

  deleteCart(cartId: string, db: Db = prisma) {
    return db.cart.delete({ where: { id: cartId } });
  },

  // ── User ─────────────────────────────────────────────────────────────────────

  findUserById(userId: string, db: Db = prisma) {
    return db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        is_verified: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true
      }
    });
  },

  // ── Payment ─────────────────────────────────────────────────────────────────

  findOrderByOrderNumber(orderNumber: string, db: Db = prisma) {
    return db.order.findFirst({
      where: { order_number: orderNumber },
      include: {
        order_items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                product_images: {
                  select: { id: true, image_url: true, is_primary: true },
                  orderBy: { is_primary: 'desc' },
                  take: 1
                }
              }
            },
            discount: { select: { id: true, type: true, value: true } }
          }
        },
        address: {
          include: {
            city: { select: { name: true } },
            province: { select: { name: true } },
            district: { select: { name: true } }
          }
        },
        store: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            city: { select: { name: true } }
          }
        }
      }
    });
  },

  findOrderItemsByOrderId(orderId: string, db: Db = prisma) {
    return db.orderItem.findMany({
      where: { order_id: orderId },
      include: { product: { select: { name: true } } }
    });
  },

  updatePaymentDetails(
    orderId: string,
    data: {
      midtrans_order_id?: string;
      midtrans_transaction_id?: string;
      midtrans_status?: string;
      payment_url?: string;
    },
    db: Db = prisma
  ) {
    return db.order.update({
      where: { id: orderId },
      data: {
        midtrans_order_id: data.midtrans_order_id,
        midtrans_transaction_id: data.midtrans_transaction_id,
        midtrans_status: data.midtrans_status,
        payment_url: data.payment_url
      }
    });
  }
};
