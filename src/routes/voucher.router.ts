import { Router } from 'express';
import { voucherController } from '../controllers/voucher.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import { createVoucherSchema, updateVoucherSchema, getVouchersQuerySchema, applyVoucherSchema } from '../validators/voucher.validator';
import { user_role } from '../../generated/prisma/client';

const router = Router();

// Static user-facing routes — must come before /:id to avoid param capture
router.get('/mine', authenticate, authorize(user_role.user), voucherController.getUserVouchers);
router.post('/apply', authenticate, authorize(user_role.user), validate(applyVoucherSchema), voucherController.applyVoucher);

// Admin read routes
router.get('/', authenticate, authorize(user_role.super_admin, user_role.store_admin), validate(getVouchersQuerySchema), voucherController.getVouchers);
router.get('/:id', authenticate, authorize(user_role.super_admin, user_role.store_admin), voucherController.getVoucherById);

// Super admin only routes
router.post('/', authenticate, authorize(user_role.super_admin), validate(createVoucherSchema), voucherController.createVoucher);
router.put('/:id', authenticate, authorize(user_role.super_admin), validate(updateVoucherSchema), voucherController.updateVoucher);
router.delete('/:id', authenticate, authorize(user_role.super_admin), voucherController.deleteVoucher);
router.patch('/:id/set-referral', authenticate, authorize(user_role.super_admin), voucherController.setReferralVoucher);
router.patch('/:id/set-referrer-reward', authenticate, authorize(user_role.super_admin), voucherController.setReferrerRewardVoucher);

export default router;
