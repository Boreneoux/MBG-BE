import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import {
    adjustStockSchema,
    createJournalSchema,
    journalQuerySchema,
    inventoryQuerySchema,
    createInventorySchema,
    inventoryIdParamSchema,
} from '../validators/inventory.validator';
import { inventoryController } from '../controllers/inventory.controller';

const inventoryRouter = Router();

// POST /inventory — super_admin + store_admin
inventoryRouter.post(
    '/',
    authenticate,
    authorize('super_admin', 'store_admin'),
    validate(createInventorySchema),
    inventoryController.createInventory
);

// DELETE /inventory/:id — super_admin + store_admin
inventoryRouter.delete(
    '/:id',
    authenticate,
    authorize('super_admin', 'store_admin'),
    validate(inventoryIdParamSchema),
    inventoryController.deleteInventory
);

// POST /inventory/adjust — super_admin + store_admin
inventoryRouter.post(
    '/adjust',
    authenticate,
    authorize('super_admin', 'store_admin'),
    validate(adjustStockSchema),
    inventoryController.adjustStock
);

// POST /inventory/journal — super_admin + store_admin
inventoryRouter.post(
    '/journal',
    authenticate,
    authorize('super_admin', 'store_admin'),
    validate(createJournalSchema),
    inventoryController.createJournal
);

// GET /inventory/journal — super_admin + store_admin (store_admin auto-scoped)
inventoryRouter.get(
    '/journal',
    authenticate,
    authorize('super_admin', 'store_admin'),
    validate(journalQuerySchema),
    inventoryController.getJournals
);

// GET /inventory — super_admin + store_admin (store_admin auto-scoped)
inventoryRouter.get(
    '/',
    authenticate,
    authorize('super_admin', 'store_admin'),
    validate(inventoryQuerySchema),
    inventoryController.getInventories
);

export default inventoryRouter;
