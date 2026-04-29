import { Request, Response } from 'express';
import { discountService } from '../services/discount.service';
import { catchAsync } from '../utils/catch-async';

export const discountController = {
    getDiscounts: catchAsync(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const store_id = req.query.store_id as string | undefined;
        const product_id = req.query.product_id as string | undefined;
        const is_active = req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined;

        const result = await discountService.getDiscounts({ page, limit, store_id, product_id, is_active });

        res.status(200).json({
            success: true,
            message: 'Discounts retrieved successfully',
            data: result.data,
            meta: result.meta
        });
    }),

    getDiscountById: catchAsync(async (req: Request, res: Response) => {
        const discount = await discountService.getDiscountById(req.params.id as string);

        res.status(200).json({
            success: true,
            message: 'Discount retrieved successfully',
            data: discount
        });
    }),

    createDiscount: catchAsync(async (req: Request, res: Response) => {
        // We will pass req.user down to the service for role-based store_id logic
        const discount = await discountService.createDiscount(req.body, req.user);

        res.status(201).json({
            success: true,
            message: 'Discount created successfully',
            data: discount
        });
    }),

    updateDiscount: catchAsync(async (req: Request, res: Response) => {
        const discount = await discountService.updateDiscount(req.params.id as string, req.body);

        res.status(200).json({
            success: true,
            message: 'Discount updated successfully',
            data: discount
        });
    }),

    deleteDiscount: catchAsync(async (req: Request, res: Response) => {
        await discountService.deleteDiscount(req.params.id as string);

        res.status(200).json({
            success: true,
            message: 'Discount deleted successfully',
            data: null
        });
    })
};
