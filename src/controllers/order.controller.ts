import { Request, Response } from 'express';
import { orderService } from '../services/order.service';
import { adminOrderService } from '../services/admin.order.service';
import { paymentService } from '../services/payment.service';
import { catchAsync } from '../utils/catch-async';

export const orderController = {
  createOrder: catchAsync(async (req: Request, res: Response) => {
    const order = await orderService.createOrder(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      message: 'Order created successfully. Please complete payment within 1 hour.',
      data: { order }
    });
  }),

  getPaymentUrl: catchAsync(async (req: Request, res: Response) => {
    const orderId = Number(req.params.id);
    const result = await paymentService.createPaymentUrl(orderId, req.user!.id);

    res.json({
      success: true,
      message: 'Payment URL generated successfully',
      data: result
    });
  }),

  getPaymentStatus: catchAsync(async (req: Request, res: Response) => {
    const orderId = Number(req.params.id);
    const result = await paymentService.getPaymentStatus(orderId, req.user!.id);

    res.json({
      success: true,
      data: result
    });
  }),

  cancelOrder: catchAsync(async (req: Request, res: Response) => {
    const orderId = Number(req.params.id);
    const order = await orderService.cancelOrder(req.user!.id, orderId);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order }
    });
  }),

  confirmReceipt: catchAsync(async (req: Request, res: Response) => {
    const orderId = Number(req.params.id);
    const order = await orderService.confirmReceipt(req.user!.id, orderId);

    res.json({
      success: true,
      message: 'Order receipt confirmed successfully',
      data: { order }
    });
  }),

  approvePayment: catchAsync(async (req: Request, res: Response) => {
    const orderId = Number(req.params.id);
    const order = await adminOrderService.approvePayment(orderId, req.user!);

    res.json({
      success: true,
      message: 'Order payment approved and processing',
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

  paymentWebhook: catchAsync(async (req: Request, res: Response) => {
    // Handle Midtrans notification
    const result = await paymentService.handlePaymentNotification(req.body);

    res.json({
      success: result.success,
      message: result.message
    });
  })
};
