import { Router } from 'express';
import { discountController } from '../controllers/discount.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import { createDiscountSchema, updateDiscountSchema, getDiscountsQuerySchema } from '../validators/discount.validator';
import { user_role } from '../../generated/prisma/client';

const router = Router();

// Retrieve discounts (can be public for store views, or protected, assuming super/admin here)
router.get('/', validate(getDiscountsQuerySchema), discountController.getDiscounts);
router.get('/:id', discountController.getDiscountById);

// Admin-only mutations
router.post(
    '/',
    authenticate,
    authorize(user_role.super_admin, user_role.store_admin),
    validate(createDiscountSchema),
    discountController.createDiscount
);

router.put(
    '/:id',
    authenticate,
    authorize(user_role.super_admin, user_role.store_admin),
    validate(updateDiscountSchema),
    discountController.updateDiscount
);

router.delete(
    '/:id',
    authenticate,
    authorize(user_role.super_admin, user_role.store_admin),
    discountController.deleteDiscount
);


export default router;
