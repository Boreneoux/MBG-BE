import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { shippingService } from '../services/shipping.service';
import type { z } from 'zod';
import type { calculateShippingSchema } from '../validators/shipping.validator';

type ShippingBody = z.infer<typeof calculateShippingSchema>['body'];

export const calculateShippingCost = catchAsync(async (req: Request, res: Response) => {
  const { store_id, address_id, weight, courier } = req.body as ShippingBody;

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
