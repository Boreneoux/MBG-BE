import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';

export class CategoryRepository {
    async findAll(search?: string) {
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
    }

    async findById(id: number) {
        return prisma.productCategory.findUnique({
            where: { id, deleted_at: null }
        });
    }

    async findByName(name: string) {
        return prisma.productCategory.findUnique({
            where: { name }
        });
    }

    async create(data: Prisma.ProductCategoryCreateInput) {
        return prisma.productCategory.create({ data });
    }

    async update(id: number, data: Prisma.ProductCategoryUpdateInput) {
        return prisma.productCategory.update({
            where: { id },
            data
        });
    }

    async softDelete(id: number) {
        return prisma.productCategory.update({
            where: { id },
            data: { deleted_at: new Date() }
        });
    }
}

export const categoryRepository = new CategoryRepository();
