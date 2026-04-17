import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';
import { GetDiscountsQuery } from '../types/discount';

export const discountRepository = {
    findAll(query: GetDiscountsQuery) {
        const { page = 1, limit = 10, store_id, product_id, is_active } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.DiscountWhereInput = {
            deleted_at: null,
            ...(store_id && { store_id }),
            ...(product_id && { product_id }),
            ...(is_active !== undefined && { is_active })
        };

        return prisma.$transaction([
            prisma.discount.count({ where }),
            prisma.discount.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: { product: true, store: true }
            })
        ]);
    },

    findById(id: number) {
        return prisma.discount.findUnique({
            where: { id, deleted_at: null },
            include: { product: true, store: true }
        });
    },

    create(data: Prisma.DiscountCreateInput) {
        return prisma.discount.create({ data, include: { product: true, store: true } });
    },

    update(id: number, data: Prisma.DiscountUpdateInput) {
        return prisma.discount.update({
            where: { id },
            data,
            include: { product: true, store: true }
        });
    },

    softDelete(id: number) {
        return prisma.discount.update({
            where: { id },
            data: { deleted_at: new Date() }
        });
    }
};
