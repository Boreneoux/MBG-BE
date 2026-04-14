import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { shippingService } from '../services/shipping.service';

export const calculateShippingCost = catchAsync(async (req: Request, res: Response) => {
  const { store_id, address_id, weight, courier } = req.body as {
    store_id: number;
    address_id: number;
    weight: number;
    courier: string;
  };

  const result = await shippingService.calculate({
    store_id,
    address_id,
    user_id: req.user!.id,
    weight,
    courier
  });

  res.json({
    success: true,
    message: 'Shipping options retrieved',
    data: result
  });
});
