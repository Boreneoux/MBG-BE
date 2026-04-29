import { discount_type, voucher_type } from '../../generated/prisma/client';

export interface CreateVoucherInput {
    code: string;
    discount_type: discount_type;
    discount_value: number;
    max_discount_amount?: number | null;
    min_purchase_amount?: number | null;
    usage_type: voucher_type;
    product_id?: string | null;
    reward_duration_days?: number | null;
    expired_at: Date | string;
}

export interface GetVouchersQuery {
    page?: number;
    limit?: number;
    usage_type?: voucher_type;
}

export interface ApplyVoucherInput {
    code: string;
    cart_total: number;
    store_id: string;
    product_ids?: string[];
}
