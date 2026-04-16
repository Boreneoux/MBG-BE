import { Request, Response } from 'express';
import { orderService } from '../services/order.service';
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

  paymentWebhook: catchAsync(async (req: Request, res: Response) => {
    const { order_id, status, reference } = req.body;

    // Basic validation - in production, verify webhook signature
    if (!order_id || !status) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook payload'
      });
    }

    if (status === 'paid') {
      const order = await orderService.confirmPayment(parseInt(order_id, 10), reference);

      res.json({
        success: true,
        message: 'Payment confirmed',
        data: { order }
      });
    } else {
      res.json({
        success: true,
        message: 'Webhook received'
      });
    }
  })
};
