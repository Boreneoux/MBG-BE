import { discount_type } from '../../generated/prisma/client';

export interface CreateDiscountInput {
    store_id: number;
    product_id?: number | null;
    type: discount_type;
    value?: number | null;
    min_purchase_amount?: number | null;
    max_discount_value?: number | null;
    started_at?: Date | string | null;
    expired_at?: Date | string | null;
}

export interface UpdateDiscountInput extends Partial<CreateDiscountInput> {
    is_active?: boolean;
}

export interface GetDiscountsQuery {
    page?: number;
    limit?: number;
    store_id?: number;
    product_id?: number;
    is_active?: boolean;
}
