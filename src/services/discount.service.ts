import { discountRepository } from '../repositories/discount.repository';
import { AppError } from '../utils/AppError';
import { CreateDiscountInput, UpdateDiscountInput, GetDiscountsQuery } from '../types/discount';

export const discountService = {
    async getDiscounts(query: GetDiscountsQuery) {
        const [total, data] = await discountRepository.findAll(query);
        const { page = 1, limit = 10 } = query;

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    async getDiscountById(id: number) {
        const discount = await discountRepository.findById(id);
        if (!discount) {
            throw new AppError('Discount not found', 404);
        }
        return discount;
    },

    async createDiscount(data: CreateDiscountInput) {
        return await discountRepository.create({
            type: data.type,
            value: data.value,
            min_purchase_amount: data.min_purchase_amount,
            max_discount_value: data.max_discount_value,
            started_at: data.started_at ? new Date(data.started_at) : null,
            expired_at: data.expired_at ? new Date(data.expired_at) : null,
            store: { connect: { id: data.store_id } },
            ...(data.product_id && { product: { connect: { id: data.product_id } } })
        });
    },

    async updateDiscount(id: number, data: UpdateDiscountInput) {
        const discount = await discountRepository.findById(id);
        if (!discount) {
            throw new AppError('Discount not found', 404);
        }

        const updateData: any = { ...data };

        if (data.started_at) updateData.started_at = new Date(data.started_at);
        if (data.expired_at) updateData.expired_at = new Date(data.expired_at);
        if (data.product_id !== undefined) {
            if (data.product_id === null) {
                updateData.product = { disconnect: true };
            } else {
                updateData.product = { connect: { id: data.product_id } };
            }
            delete updateData.product_id;
        }
        if (data.store_id !== undefined) {
            updateData.store = { connect: { id: data.store_id } };
            delete updateData.store_id;
        }

        return await discountRepository.update(id, updateData);
    },

    async deleteDiscount(id: number) {
        const discount = await discountRepository.findById(id);
        if (!discount) {
            throw new AppError('Discount not found', 404);
        }
        return discountRepository.softDelete(id);
    }
};
