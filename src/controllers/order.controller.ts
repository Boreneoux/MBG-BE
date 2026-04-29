import { Request, Response } from 'express';
import { orderService } from '../services/order.service';
import { adminOrderService } from '../services/admin.order.service';
import { paymentService } from '../services/payment.service';
import { catchAsync } from '../utils/catch-async';

export const orderController = {
  getOrders: catchAsync(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const search = req.query.search as string | undefined;

    const result = await orderService.getUserOrders(
      req.user!.id,
      page,
      limit,
      search
    );

    res.json({
      success: true,
      data: result.data,
      meta: result.meta
    });
  }),

  getOrder: catchAsync(async (req: Request, res: Response) => {
    const order = await orderService.getOrderForUser(
      req.user!.id,
      req.params.orderNumber as string
    );

    res.json({
      success: true,
      data: order
    });
  }),

  createOrder: catchAsync(async (req: Request, res: Response) => {
    const order = await orderService.createOrder(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      message:
        'Order created successfully. Please complete payment within 1 hour.',
      data: { order }
    });
  }),

  getPaymentUrl: catchAsync(async (req: Request, res: Response) => {
    const result = await paymentService.createPaymentUrl(
      req.params.orderNumber as string,
      req.user!.id
    );

    res.json({
      success: true,
      message: 'Payment URL generated successfully',
      data: result
    });
  }),

  getPaymentStatus: catchAsync(async (req: Request, res: Response) => {
    const result = await paymentService.getPaymentStatus(
      req.params.orderNumber as string,
      req.user!.id
    );

    res.json({
      success: true,
      data: result
    });
  }),

  cancelOrder: catchAsync(async (req: Request, res: Response) => {
    const order = await orderService.cancelOrder(
      req.user!.id,
      req.params.orderNumber as string
    );

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order }
    });
  }),

  confirmReceipt: catchAsync(async (req: Request, res: Response) => {
    const order = await orderService.confirmReceipt(
      req.user!.id,
      req.params.orderNumber as string
    );

    res.json({
      success: true,
      message: 'Order receipt confirmed successfully',
      data: { order }
    });
  }),

  approvePayment: catchAsync(async (req: Request, res: Response) => {
    const order = await adminOrderService.approvePayment(
      req.params.orderNumber as string,
      req.user!
    );

    res.json({
      success: true,
      message: 'Order payment approved and processing',
      data: { order }
    });
  }),

  shipOrder: catchAsync(async (req: Request, res: Response) => {
    const order = await adminOrderService.shipOrder(
      req.params.orderNumber as string,
      req.user!
    );

    res.json({
      success: true,
      message: 'Order marked as shipped',
      data: { order }
    });
  }),

  paymentWebhook: catchAsync(async (req: Request, res: Response) => {
    // Handle Midtrans notification
    const result = await paymentService.handlePaymentNotification(req.body);

    res.json({
      success: result.success,
      message: result.message
    });
  })
};
