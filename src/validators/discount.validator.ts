import { z } from 'zod';
import { discount_type } from '../../generated/prisma/client';

const discountTypeEnum = z.enum([
    discount_type.percentage,
    discount_type.nominal,
    discount_type.buy_one_get_one
]);

export const createDiscountSchema = z.object({
    body: z.object({
        store_id: z.union([z.string().uuid(), z.literal('all')]).optional().nullable(),
        product_id: z.string().uuid('product_id must be a valid UUID').optional().nullable(),
        type: discountTypeEnum,
        value: z.number().min(0).optional().nullable(),
        min_purchase_amount: z.number().min(0).optional().nullable(),
        max_discount_value: z.number().min(0).optional().nullable(),
        started_at: z.string().datetime().optional().nullable(),
        expired_at: z.string().datetime().optional().nullable()
    }).refine((data) => {
        if (data.type === 'percentage' || data.type === 'nominal') {
            return data.value !== null && data.value !== undefined;
        }
        return true;
    }, {
        message: "Value is required for percentage and nominal discount types",
        path: ["value"]
    })
});

export const updateDiscountSchema = z.object({
    body: z.object({
        is_active: z.boolean().optional(),
        product_id: z.string().uuid('product_id must be a valid UUID').optional().nullable(),
        type: discountTypeEnum.optional(),
        value: z.number().min(0).optional().nullable(),
        min_purchase_amount: z.number().min(0).optional().nullable(),
        max_discount_value: z.number().min(0).optional().nullable(),
        started_at: z.string().datetime().optional().nullable(),
        expired_at: z.string().datetime().optional().nullable()
    })
});

export const getDiscountsQuerySchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
        store_id: z.string().uuid().optional(),
        product_id: z.string().uuid().optional(),
        is_active: z.enum(['true', 'false']).optional()
    })
});
