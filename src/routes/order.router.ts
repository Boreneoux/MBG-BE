import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import { createOrderSchema } from '../validators/order.validator';

const router = Router();

// All order routes require authentication
router.use(authenticate);

// POST /api/orders
router.post('/', validate(createOrderSchema), orderController.createOrder);

export default router;
