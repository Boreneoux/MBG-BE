import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';
import logger from '../config/logger.config';
import { orderRepository } from '../repositories/order.repository';
import { AdminOrderQueryInput } from '../types/order';
import { JwtPayload } from '../middlewares/auth.middleware';
import { Tx } from '../types/order';

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
      orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async rejectPaymentProof(orderId: number, user: JwtPayload) {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) throw new AppError('Order not found', 404);
    if (order.status !== 'waiting_for_confirmation') {
      throw new AppError('Order is not awaiting confirmation', 400);
    }
    if (user.role === 'store_admin') {
      const storeAdmin = await orderRepository.findStoreAdminByUserId(user.id);
      if (!storeAdmin || storeAdmin.store_id !== order.store_id) {
        throw new AppError('Forbidden: cannot reject payment for this order', 403);
      }
    }

    const updatedOrder = await orderRepository.rejectPaymentProof(orderId, prisma);
    logger.info(`Payment proof rejected for order ${order.order_number}`);
    return updatedOrder;
  },

  async approvePayment(orderId: number, user: JwtPayload) {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) throw new AppError('Order not found', 404);
    if (order.status !== 'waiting_for_confirmation') {
      throw new AppError('Order is not awaiting confirmation', 400);
    }
    if (user.role === 'store_admin') {
      const storeAdmin = await orderRepository.findStoreAdminByUserId(user.id);
      if (!storeAdmin || storeAdmin.store_id !== order.store_id) {
        throw new AppError('Forbidden: cannot approve this order', 403);
      }
    }

    const updatedOrder = await orderRepository.approvePayment(orderId);
    logger.info(`Order approved for processing: ${order.order_number}`);
    return updatedOrder;
  },

  async shipOrder(orderId: number, user: JwtPayload) {
    const order = await orderRepository.findOrderById(orderId);
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

    const updatedOrder = await orderRepository.shipOrder(orderId);
    logger.info(`Order marked shipped: ${order.order_number}`);
    return updatedOrder;
  },

  async cancelOrderAdmin(orderId: number, user: JwtPayload) {
    const order = await orderRepository.findOrderById(orderId);
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

      return orderRepository.cancelOrder(orderId, tx);
    });

    logger.info(`Admin canceled order ${order.order_number}`);
    return updatedOrder;
  }
};
