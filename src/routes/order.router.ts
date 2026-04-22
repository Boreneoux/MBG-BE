import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import { user_role } from '../../generated/prisma/client';
import {
  createOrderSchema,
  orderIdParamsSchema
} from '../validators/order.validator';

const router = Router();

// Webhook route (no authentication required)
router.post('/webhook/payment', orderController.paymentWebhook);

// All order routes require authentication
router.use(authenticate);

// GET /api/orders  — paginated list for the logged-in user
router.get('/', orderController.getOrders);

// GET /api/orders/:id  — single order detail
router.get('/:id', validate(orderIdParamsSchema), orderController.getOrder);

// POST /api/orders
router.post('/', validate(createOrderSchema), orderController.createOrder);

// Payment routes
router.get('/:id/payment-url', validate(orderIdParamsSchema), orderController.getPaymentUrl);
router.get('/:id/payment-status', validate(orderIdParamsSchema), orderController.getPaymentStatus);

router.post('/:id/cancel', validate(orderIdParamsSchema), orderController.cancelOrder);
router.post('/:id/confirm-receipt', validate(orderIdParamsSchema), orderController.confirmReceipt);
router.post(
  '/:id/approve-payment',
  authorize(user_role.super_admin, user_role.store_admin),
  validate(orderIdParamsSchema),
  orderController.approvePayment
);
router.post(
  '/:id/ship',
  authorize(user_role.super_admin, user_role.store_admin),
  validate(orderIdParamsSchema),
  orderController.shipOrder
);

export default router;
