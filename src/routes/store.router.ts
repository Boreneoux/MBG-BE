import { Router } from 'express';
import { authenticate, authorize, optionalAuthenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import {
  nearestStoreQuerySchema,
  createStoreSchema,
  updateStoreSchema,
  storeParamsSchema,
  assignAdminSchema
} from '../validators/store.validator';
import { storeController } from '../controllers/store.controller';

const storeRouter = Router();

// GET /stores
// - Admin roles (super_admin, store_admin): list all active stores
// - Public: nearest store by lat/lng (or default fallback)
storeRouter.get(
  '/',
  optionalAuthenticate,
  validate(nearestStoreQuerySchema),
  storeController.getStores
);

// GET /stores/:id — Super Admin + Store Admin
storeRouter.get(
  '/:id',
  authenticate,
  authorize('super_admin', 'store_admin'),
  validate(storeParamsSchema),
  storeController.getById
);

// POST /stores — Super Admin only
storeRouter.post(
  '/',
  authenticate,
  authorize('super_admin'),
  validate(createStoreSchema),
  storeController.create
);

// PUT /stores/:id — Super Admin only
storeRouter.put(
  '/:id',
  authenticate,
  authorize('super_admin'),
  validate(updateStoreSchema),
  storeController.update
);

// DELETE /stores/:id — Super Admin only
storeRouter.delete(
  '/:id',
  authenticate,
  authorize('super_admin'),
  validate(storeParamsSchema),
  storeController.delete
);

// POST /stores/:id/admins — Super Admin only
storeRouter.post(
  '/:id/admins',
  authenticate,
  authorize('super_admin'),
  validate(assignAdminSchema),
  storeController.assignAdmin
);

export default storeRouter;
