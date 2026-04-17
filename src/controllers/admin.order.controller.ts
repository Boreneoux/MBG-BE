import { Request, Response } from 'express';
import { adminOrderService } from '../services/admin.order.service';
import { catchAsync } from '../utils/catch-async';
import { AdminOrderQueryInput } from '../types/order';

export const adminOrderController = {
  getOrders: catchAsync(async (req: Request, res: Response) => {
    const query: AdminOrderQueryInput = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      sort: (req.query.sort as string) === 'asc' ? 'asc' : 'desc',
      warehouse_id: req.query.warehouse_id ? parseInt(req.query.warehouse_id as string, 10) : undefined,
      order_number: req.query.order_number as string | undefined,
      status: req.query.status as any,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined
    };

    const result = await adminOrderService.getAdminOrders(query, req.user!);

    res.json({
      success: true,
      message: 'Orders retrieved successfully',
      data: result
    });
  }),

  confirmPaymentProof: catchAsync(async (req: Request, res: Response) => {
    const orderId = Number(req.params.id);
    const order = await adminOrderService.approvePayment(orderId, req.user!);

    res.json({
      success: true,
      message: 'Payment proof confirmed',
      data: { order }
    });
  }),

  rejectPaymentProof: catchAsync(async (req: Request, res: Response) => {
    const orderId = Number(req.params.id);
    const order = await adminOrderService.rejectPaymentProof(orderId, req.user!);

    res.json({
      success: true,
      message: 'Payment proof rejected',
      data: { order }
    });
  }),

  shipOrder: catchAsync(async (req: Request, res: Response) => {
    const orderId = Number(req.params.id);
    const order = await adminOrderService.shipOrder(orderId, req.user!);

    res.json({
      success: true,
      message: 'Order marked as shipped',
      data: { order }
    });
  }),

  cancelOrder: catchAsync(async (req: Request, res: Response) => {
    const orderId = Number(req.params.id);
    const order = await adminOrderService.cancelOrderAdmin(orderId, req.user!);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order }
    });
  })
};
