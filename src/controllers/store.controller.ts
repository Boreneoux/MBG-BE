import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { storeService } from '../services/store.service';

export const storeController = {
  // GET /stores
  // - Super Admin / Store Admin: returns all active stores
  // - Public: returns nearest store (requires lat/lng query params or falls back to default)
  getStores: catchAsync(async (req: Request, res: Response) => {
    const role = req.user?.role;

    if (role === 'super_admin' || role === 'store_admin') {
      const { page, limit, search } = req.query as { page?: string; limit?: string; search?: string };
      const result = await storeService.getAll(Number(page) || 1, Number(limit) || 10, search);
      return res.json({ success: true, message: 'Stores retrieved', data: result });
    }

    const { lat, lng } = req.query as { lat?: string; lng?: string };
    const latNum = lat !== undefined ? Number(lat) : undefined;
    const lngNum = lng !== undefined ? Number(lng) : undefined;
    const result = await storeService.findNearest(latNum, lngNum);
    const message =
      result.distance_km === null ? 'Default store returned' : 'Nearest store found';
    res.json({ success: true, message, data: result });
  }),

  // GET /stores/:id
  getById: catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await storeService.getById(id);
    res.json({ success: true, message: 'Store retrieved', data: result });
  }),

  // POST /stores
  create: catchAsync(async (req: Request, res: Response) => {
    const result = await storeService.create(req.body);
    res.status(201).json({ success: true, message: 'Store created', data: result });
  }),

  // PUT /stores/:id
  update: catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await storeService.update(id, req.body);
    res.json({ success: true, message: 'Store updated', data: result });
  }),

  // DELETE /stores/:id
  delete: catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await storeService.delete(id);
    res.status(204).send();
  }),

  // POST /stores/:id/admins
  assignAdmin: catchAsync(async (req: Request, res: Response) => {
    const storeId = Number(req.params.id);
    const { user_id } = req.body;
    const result = await storeService.assignAdmin(storeId, user_id);
    res.status(201).json({ success: true, message: 'Admin assigned to store', data: result });
  })
};
