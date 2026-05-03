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
router.get('/:orderNumber', validate(orderIdParamsSchema), adminOrderController.getOrder);
router.post('/:orderNumber/confirm-payment-proof', validate(orderIdParamsSchema), adminOrderController.confirmPaymentProof);
router.post('/:orderNumber/ship', validate(orderIdParamsSchema), adminOrderController.shipOrder);
router.post('/:orderNumber/cancel', validate(orderIdParamsSchema), adminOrderController.cancelOrder);

export default router;
