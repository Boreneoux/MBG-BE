import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { storeService } from '../services/store.service';

export const getNearest = catchAsync(async (req: Request, res: Response) => {
  const { lat, lng } = req.query as { lat?: string; lng?: string };

  const latNum = lat !== undefined ? Number(lat) : undefined;
  const lngNum = lng !== undefined ? Number(lng) : undefined;

  const result = await storeService.findNearest(latNum, lngNum);
  const message =
    result.distance_km === null ? 'Default store returned' : 'Nearest store found';

  res.json({ success: true, message, data: result });
});

