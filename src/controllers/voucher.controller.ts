import { Request, Response } from 'express';
import { voucherService } from '../services/voucher.service';
import { catchAsync } from '../utils/catch-async';

export const voucherController = {
    getVouchers: catchAsync(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const usage_type = req.query.usage_type as any;

        const result = await voucherService.getVouchers({ page, limit, usage_type });

        res.status(200).json({
            success: true,
            message: 'Vouchers retrieved successfully',
            data: result.data,
            meta: result.meta
        });
    }),

    getVoucherById: catchAsync(async (req: Request, res: Response) => {
        const voucher = await voucherService.getVoucherById(req.params.id as string);

        res.status(200).json({
            success: true,
            message: 'Voucher retrieved successfully',
            data: voucher
        });
    }),

    createVoucher: catchAsync(async (req: Request, res: Response) => {
        const voucher = await voucherService.createVoucher(req.body);

        res.status(201).json({
            success: true,
            message: 'Voucher created successfully',
            data: voucher
        });
    }),

    updateVoucher: catchAsync(async (req: Request, res: Response) => {
        const voucher = await voucherService.updateVoucher(req.params.id as string, req.body);

        res.status(200).json({
            success: true,
            message: 'Voucher updated successfully',
            data: voucher
        });
    }),

    deleteVoucher: catchAsync(async (req: Request, res: Response) => {
        await voucherService.deleteVoucher(req.params.id as string);

        res.status(200).json({
            success: true,
            message: 'Voucher deleted successfully',
            data: null
        });
    }),

    getUserVouchers: catchAsync(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const vouchers = await voucherService.getUserVouchers(userId);

        res.status(200).json({
            success: true,
            message: 'User vouchers retrieved successfully',
            data: vouchers
        });
    }),

    setReferrerRewardVoucher: catchAsync(async (req: Request, res: Response) => {
        const voucher = await voucherService.setAsReferrerRewardVoucher(req.params.id as string);

        res.status(200).json({
            success: true,
            message: 'Referrer reward voucher updated successfully',
            data: voucher
        });
    }),

    setReferralVoucher: catchAsync(async (req: Request, res: Response) => {
        const voucher = await voucherService.setAsReferralVoucher(req.params.id as string);

        res.status(200).json({
            success: true,
            message: 'Referral voucher updated successfully',
            data: voucher
        });
    }),

    applyVoucher: catchAsync(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const result = await voucherService.applyVoucher(userId, req.body);

        res.status(200).json({
            success: true,
            message: 'Voucher validation successful',
            data: result
        });
    }),
};
