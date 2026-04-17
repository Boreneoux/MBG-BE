import { Router } from 'express';
import { adminOrderController } from '../controllers/admin.order.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import { user_role } from '../../generated/prisma/client';
import { getAdminOrdersQuerySchema, orderIdParamsSchema } from '../validators/order.validator';

const router = Router();

router.use(authenticate);
router.use(authorize(user_role.super_admin, user_role.store_admin));

router.get('/', validate(getAdminOrdersQuerySchema), adminOrderController.getOrders);
router.post('/:id/confirm-payment-proof', validate(orderIdParamsSchema), adminOrderController.confirmPaymentProof);
router.post('/:id/reject-payment-proof', validate(orderIdParamsSchema), adminOrderController.rejectPaymentProof);
router.post('/:id/ship', validate(orderIdParamsSchema), adminOrderController.shipOrder);
router.post('/:id/cancel', validate(orderIdParamsSchema), adminOrderController.cancelOrder);

export default router;
