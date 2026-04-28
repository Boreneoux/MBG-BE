import { z } from 'zod';
import { discount_type, voucher_type } from '../../generated/prisma/client';

const discountTypeEnum = z.enum([
    discount_type.percentage,
    discount_type.nominal,
    discount_type.buy_one_get_one
]);

const voucherTypeEnum = z.enum([
    voucher_type.product_specific,
    voucher_type.total_purchase,
    voucher_type.shipping
]);

export const createVoucherSchema = z.object({
    body: z.object({
        code: z.string().min(3).max(50),
        discount_type: discountTypeEnum,
        discount_value: z.number().min(0),
        max_discount_amount: z.number().min(0).optional().nullable(),
        min_purchase_amount: z.number().min(0).optional().nullable(),
        usage_type: voucherTypeEnum,
        product_id: z.string().uuid('product_id must be a valid UUID').optional().nullable(),
        expired_at: z.string().datetime()
    }).refine((data) => {
        if (data.usage_type === 'product_specific') {
            return data.product_id !== null && data.product_id !== undefined;
        }
        return true;
    }, {
        message: "Product ID is required for product_specific vouchers",
        path: ["product_id"]
    })
});

export const updateVoucherSchema = z.object({
    body: z.object({
        code: z.string().min(3).max(50).optional(),
        discount_type: discountTypeEnum.optional(),
        discount_value: z.number().min(0).optional(),
        max_discount_amount: z.number().min(0).optional().nullable(),
        min_purchase_amount: z.number().min(0).optional().nullable(),
        usage_type: voucherTypeEnum.optional(),
        product_id: z.string().uuid('product_id must be a valid UUID').optional().nullable(),
        expired_at: z.string().datetime().optional()
    })
});

export const getVouchersQuerySchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
        usage_type: voucherTypeEnum.optional()
    })
});

// Used at checkout
export const applyVoucherSchema = z.object({
    body: z.object({
        code: z.string().min(1, 'Voucher code is required'),
        cart_total: z.number().min(0),
        store_id: z.string().uuid('store_id must be a valid UUID'),
        product_ids: z.array(z.string().uuid()).optional()
    })
});
