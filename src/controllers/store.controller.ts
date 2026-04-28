import { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async';
import { storeService } from '../services/store.service';
import { productService } from '../services/product.service';

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

  // GET /stores/:slug
  getById: catchAsync(async (req: Request, res: Response) => {
    const result = await storeService.getBySlug(req.params.slug as string);
    res.json({ success: true, message: 'Store retrieved', data: result });
  }),

  // POST /stores
  create: catchAsync(async (req: Request, res: Response) => {
    const result = await storeService.create(req.body);
    res.status(201).json({ success: true, message: 'Store created', data: result });
  }),

  // PUT /stores/:slug
  update: catchAsync(async (req: Request, res: Response) => {
    const result = await storeService.update(req.params.slug as string, req.body);
    res.json({ success: true, message: 'Store updated', data: result });
  }),

  // DELETE /stores/:slug
  delete: catchAsync(async (req: Request, res: Response) => {
    await storeService.delete(req.params.slug as string);
    res.status(204).send();
  }),

  // GET /stores/:slug/products — public
  getStoreProducts: catchAsync(async (req: Request, res: Response) => {
    const { store } = await storeService.getBySlug(req.params.slug as string);
    const storeId = store.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 8;

    const result = await productService.getProducts({ page, limit, storeId });
    res.json({ success: true, message: 'Store products retrieved', data: result.data, meta: result.meta });
  }),

  // POST /stores/:slug/admins
  assignAdmin: catchAsync(async (req: Request, res: Response) => {
    const { user_id } = req.body;
    const result = await storeService.assignAdmin(req.params.slug as string, user_id);
    res.status(201).json({ success: true, message: 'Admin assigned to store', data: result });
  }),

  // DELETE /stores/:slug/admins/:userId
  unassignAdmin: catchAsync(async (req: Request, res: Response) => {
    await storeService.unassignAdmin(req.params.slug as string, req.params.userId as string);
    res.status(200).json({ success: true, message: 'Admin unassigned from store', data: null });
  })
};
