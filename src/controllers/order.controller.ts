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
  })
};
