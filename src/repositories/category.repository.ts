import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';

export const categoryRepository = {
    findAll(search?: string) {
        const where: Prisma.ProductCategoryWhereInput = {
            deleted_at: null,
            ...(search && {
                name: { contains: search, mode: 'insensitive' }
            })
        };

        return prisma.productCategory.findMany({
            where,
            orderBy: { created_at: 'desc' }
        });
    },

    findById(id: string) {
        return prisma.productCategory.findFirst({
            where: { id, deleted_at: null }
        });
    },

    findBySlug(slug: string) {
        return prisma.productCategory.findFirst({
            where: { slug, deleted_at: null }
        });
    },

    findByName(name: string) {
        return prisma.productCategory.findUnique({
            where: { name }
        });
    },

    create(data: Prisma.ProductCategoryCreateInput) {
        return prisma.productCategory.create({ data });
    },

    update(id: string, data: Prisma.ProductCategoryUpdateInput) {
        return prisma.productCategory.update({
            where: { id },
            data
        });
    },

    softDelete(id: string) {
        return prisma.productCategory.update({
            where: { id },
            data: { deleted_at: new Date() }
        });
    }
};
