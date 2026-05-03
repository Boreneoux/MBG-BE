import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';
import logger from '../config/logger.config';
import { orderRepository } from '../repositories/order.repository';
import { AdminOrderQueryInput } from '../types/order';
import { JwtPayload } from '../middlewares/auth.middleware';
import { Tx } from '../types/order';
import { haversineKm } from '../helpers/geo.helper';

// ─── Shipment timer helper ────────────────────────────────────────────────────

const MIN_SHIP_MINUTES = 30;
const MAX_SHIP_MINUTES = 120;
const MAX_DISTANCE_KM = 50; // distance at which timer reaches maximum

/**
 * Compute a simulated shipment time based on distance.
 * - 0 km  → random between 30–60 min
 * - 50+ km → random between 90–120 min
 * - Linearly interpolated in between with added randomness (±15 min).
 */
function computeShipSimulateAt(distanceKm: number): Date {
  const clampedKm = Math.min(distanceKm, MAX_DISTANCE_KM);
  const ratio = clampedKm / MAX_DISTANCE_KM; // 0..1

  const baseMinutes =
    MIN_SHIP_MINUTES + ratio * (MAX_SHIP_MINUTES - MIN_SHIP_MINUTES);

  // Add random jitter ±15 minutes
  const jitter = (Math.random() - 0.5) * 30;
  const finalMinutes = Math.max(
    MIN_SHIP_MINUTES,
    Math.min(MAX_SHIP_MINUTES, baseMinutes + jitter)
  );

  const simulateAt = new Date();
  simulateAt.setSeconds(
    simulateAt.getSeconds() + Math.round(finalMinutes * 60)
  );
  return simulateAt;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const adminOrderService = {
  async getAdminOrders(query: AdminOrderQueryInput, user: JwtPayload) {
    let warehouseId = query.warehouse_id;

    if (user.role === 'store_admin') {
      const storeAdmin = await orderRepository.findStoreAdminByUserId(user.id);
      if (!storeAdmin) throw new AppError('Store admin is not assigned to any store', 400);
      warehouseId = storeAdmin.store_id;
    }

    const where: Prisma.OrderWhereInput = {
      deleted_at: null,
      ...(warehouseId !== undefined && { store_id: warehouseId }),
      ...(query.order_number && {
        order_number: { contains: query.order_number, mode: 'insensitive' }
      }),
      ...(query.status && { status: query.status }),
      ...((query.from || query.to) && {
        created_at: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) })
        }
      })
    };

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sort = query.sort ?? 'desc';

    const [orders, total] = await Promise.all([
      orderRepository.findOrdersForAdmin({
        where,
        skip,
        take: limit,
        orderBy: { created_at: sort }
      }),
      orderRepository.countOrders(where)
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async getAdminOrderDetail(orderNumber: string, user: JwtPayload) {
    const lean = await orderRepository.findOrderByOrderNumber(orderNumber);
    if (!lean) throw new AppError('Order not found', 404);

    if (user.role === 'store_admin') {
      const storeAdmin = await orderRepository.findStoreAdminByUserId(user.id);
      if (!storeAdmin || storeAdmin.store_id !== lean.store_id) {
        throw new AppError('Forbidden: cannot view this order', 403);
      }
    }

    return orderRepository.findOrderById(lean.id);
  },

  /**
   * Admin approves a Midtrans-confirmed payment.
   * Transitions: waiting_for_payment OR waiting_for_confirmation → processing
   *
   * Accepts both statuses to handle:
   *  - Normal flow: webhook fires → waiting_for_confirmation → admin approves
   *  - Local dev / webhook missed: order stays in waiting_for_payment → admin approves directly
   *
   * Also computes a distance-based simulated shipment timer.
   */
  async approvePayment(orderNumber: string, user: JwtPayload) {
    const order = await orderRepository.findOrderByOrderNumber(orderNumber);
    if (!order) throw new AppError('Order not found', 404);

    const approvableStatuses = ['waiting_for_payment', 'waiting_for_confirmation'];
    if (!approvableStatuses.includes(order.status)) {
      throw new AppError(
        'Order must be in "waiting for payment" or "waiting for confirmation" to approve',
        400
      );
    }

    if (user.role === 'store_admin') {
      const storeAdmin = await orderRepository.findStoreAdminByUserId(user.id);
      if (!storeAdmin || storeAdmin.store_id !== order.store_id) {
        throw new AppError('Forbidden: cannot approve this order', 403);
      }
    }

    const updatedOrder = await orderRepository.approvePayment(order.id);
    logger.info(`Order approved for processing (packing): ${order.order_number}`);
    return updatedOrder;
  },

  /**
   * Admin starts the simulated shipment process.
   * Order remains 'processing' but the shipped_simulate_at timer starts.
   */
  async processShipment(orderNumber: string, user: JwtPayload) {
    const order = await orderRepository.findOrderByOrderNumber(orderNumber);
    if (!order) throw new AppError('Order not found', 404);

    if (order.status !== 'processing') {
      throw new AppError('Order must be in processing state to ship', 400);
    }
    if (order.shipped_simulate_at) {
      throw new AppError('Shipment is already processing', 400);
    }

    if (user.role === 'store_admin') {
      const storeAdmin = await orderRepository.findStoreAdminByUserId(user.id);
      if (!storeAdmin || storeAdmin.store_id !== order.store_id) {
        throw new AppError('Forbidden: cannot process shipment for this order', 403);
      }
    }

    // Compute distance between store and delivery address for the shipment timer
    let distanceKm = 0;
    if (order.store && order.address) {
      const storeLat = Number((order.store as any).latitude ?? 0);
      const storeLon = Number((order.store as any).longitude ?? 0);
      const addrLat = Number(order.address.latitude ?? 0);
      const addrLon = Number(order.address.longitude ?? 0);
      distanceKm = haversineKm(storeLat, storeLon, addrLat, addrLon);
    }

    const shippedSimulateAt = computeShipSimulateAt(distanceKm);

    const updatedOrder = await orderRepository.setProcessing(order.id, shippedSimulateAt);
    logger.info(
      `Order shipment processing started: ${order.order_number} | ` +
      `distance=${distanceKm.toFixed(2)} km | ` +
      `ship_at=${shippedSimulateAt.toISOString()}`
    );
    return updatedOrder;
  },

  /**
   * Manual override: admin marks an order as shipped immediately.
   * (The scheduler normally handles this automatically via shipped_simulate_at.)
   */
  async shipOrder(orderNumber: string, user: JwtPayload) {
    const order = await orderRepository.findOrderByOrderNumber(orderNumber);
    if (!order) throw new AppError('Order not found', 404);
    if (order.status !== 'processing') {
      throw new AppError('Order is not ready to ship', 400);
    }
    if (user.role === 'store_admin') {
      const storeAdmin = await orderRepository.findStoreAdminByUserId(user.id);
      if (!storeAdmin || storeAdmin.store_id !== order.store_id) {
        throw new AppError('Forbidden: cannot ship this order', 403);
      }
    }

    const updatedOrder = await orderRepository.shipOrder(order.id);
    logger.info(`Order manually marked shipped: ${order.order_number}`);
    return updatedOrder;
  },

  async cancelOrderAdmin(orderNumber: string, user: JwtPayload) {
    const lean = await orderRepository.findOrderByOrderNumber(orderNumber);
    if (!lean) throw new AppError('Order not found', 404);
    const order = await orderRepository.findOrderById(lean.id);
    if (!order) throw new AppError('Order not found', 404);
    if (['shipped', 'confirmed', 'cancelled'].includes(order.status)) {
      throw new AppError('Order cannot be canceled after shipment', 400);
    }
    if (user.role === 'store_admin') {
      const storeAdmin = await orderRepository.findStoreAdminByUserId(user.id);
      if (!storeAdmin || storeAdmin.store_id !== order.store_id) {
        throw new AppError('Forbidden: cannot cancel this order', 403);
      }
    }

    const updatedOrder = await prisma.$transaction(async (tx: Tx) => {
      for (const item of order.order_items) {
        const inventory = await tx.storeInventory.findUnique({
          where: {
            store_id_product_id: {
              store_id: order.store_id,
              product_id: item.product_id
            }
          }
        });

        if (!inventory) {
          throw new AppError('Store inventory not found for order cancellation', 400);
        }

        await orderRepository.incrementStock(inventory.id, item.quantity, tx);
        await orderRepository.createStockJournal(
          {
            store_inventory_id: inventory.id,
            quantity: item.quantity,
            type: 'order_cancellation_return',
            description: `Order ${order.order_number} canceled and stock returned`,
            reference_id: order.id
          },
          tx
        );
      }

      return orderRepository.cancelOrder(order.id, tx);
    });

    logger.info(`Admin canceled order ${order.order_number}`);
    return updatedOrder;
  }
};
