import { Request, Response } from 'express';
import { cartService } from '../services/cart.service';
import { catchAsync } from '../utils/catch-async';

export const cartController = {
  getCart: catchAsync(async (req: Request, res: Response) => {
    const cart = await cartService.getCart(req.user!.id);

    res.status(200).json({
      success: true,
      message: cart ? 'Cart retrieved successfully' : 'Cart is empty',
      data: { cart }
    });
  }),

  addItem: catchAsync(async (req: Request, res: Response) => {
    const cartItem = await cartService.addItem(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      data: { cart_item: cartItem }
    });
  }),

  updateItem: catchAsync(async (req: Request, res: Response) => {
    const cartItem = await cartService.updateItem(
      req.user!.id,
      req.params.id as string,
      req.body
    );

    res.status(200).json({
      success: true,
      message: 'Cart item updated',
      data: { cart_item: cartItem }
    });
  }),

  deleteItem: catchAsync(async (req: Request, res: Response) => {
    await cartService.deleteItem(req.user!.id, req.params.id as string);

    res.status(200).json({
      success: true,
      message: 'Cart item removed',
      data: null
    });
  })
};
