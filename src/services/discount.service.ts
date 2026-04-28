import { discountRepository } from '../repositories/discount.repository';
import storeRepository from '../repositories/store.repository';
import { AppError } from '../utils/AppError';
import { CreateDiscountInput, UpdateDiscountInput, GetDiscountsQuery } from '../types/discount';
import { prisma } from '../config/prisma-client.config';

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

    async getDiscountById(id: string) {
        const discount = await discountRepository.findById(id);
        if (!discount) {
            throw new AppError('Discount not found', 404);
        }
        return discount;
    },

    async createDiscount(data: CreateDiscountInput, user?: any) {
        // Enforce store_id constraints based on role
        if (user?.role === 'store_admin') {
            // JWT doesn't carry store_id — look it up from DB
            const storeAdmin = await prisma.storeAdmin.findFirst({
                where: { user_id: user.id, deleted_at: null },
                select: { store_id: true }
            });
            if (!storeAdmin) throw new AppError('Store admin must be assigned to a store', 403);
            data.store_id = storeAdmin.store_id;
        }

        // Global discount creation (Super Admin only)
        if (data.store_id === 'all' || !data.store_id) {
            if (user?.role !== 'super_admin') {
                throw new AppError('Only super admins can create global discounts', 403);
            }

            // Get all stores
            const stores = await storeRepository.findAllActive();

            if (stores.length === 0) {
                throw new AppError('No stores found to apply discount', 400);
            }

            // Create duplicate discounts for every store
            const discountsData = stores.map((store: any) => ({
                store_id: store.id,
                product_id: data.product_id || null,
                type: data.type,
                value: data.value,
                min_purchase_amount: data.min_purchase_amount,
                max_discount_value: data.max_discount_value,
                started_at: data.started_at ? new Date(data.started_at) : null,
                expired_at: data.expired_at ? new Date(data.expired_at) : null,
            }));

            const createdDiscounts = [];
            for (const d of discountsData) {
                createdDiscounts.push(await discountRepository.create({
                    type: d.type,
                    value: d.value,
                    min_purchase_amount: d.min_purchase_amount,
                    max_discount_value: d.max_discount_value,
                    started_at: d.started_at,
                    expired_at: d.expired_at,
                    store: { connect: { id: d.store_id } },
                    ...(d.product_id && { product: { connect: { id: d.product_id } } })
                }));
            }
            return createdDiscounts[0];
        }

        return await discountRepository.create({
            type: data.type,
            value: data.value,
            min_purchase_amount: data.min_purchase_amount,
            max_discount_value: data.max_discount_value,
            started_at: data.started_at ? new Date(data.started_at) : null,
            expired_at: data.expired_at ? new Date(data.expired_at) : null,
            store: { connect: { id: data.store_id as string } },
            ...(data.product_id && { product: { connect: { id: data.product_id } } })
        });
    },

    async updateDiscount(id: string, data: UpdateDiscountInput) {
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

    async deleteDiscount(id: string) {
        const discount = await discountRepository.findById(id);
        if (!discount) {
            throw new AppError('Discount not found', 404);
        }
        return discountRepository.softDelete(id);
    }
};
