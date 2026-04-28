import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { AppError } from '../utils/AppError';
import { regionService } from '../services/region.service';

export const getProvinces = catchAsync(async (_req: Request, res: Response) => {
  const data = await regionService.getProvinces();
  res.json({ success: true, data });
});

export const getCities = catchAsync(async (req: Request, res: Response) => {
  const province_id = req.query.province_id as string | undefined;
  if (!province_id) {
    throw new AppError('province_id query param is required', 400);
  }
  const data = await regionService.getCities(province_id);
  res.json({ success: true, data });
});

export const getDistricts = catchAsync(async (req: Request, res: Response) => {
  const city_id = req.query.city_id as string | undefined;
  if (!city_id) {
    throw new AppError('city_id query param is required', 400);
  }
  const data = await regionService.getDistricts(city_id);
  res.json({ success: true, data });
});
