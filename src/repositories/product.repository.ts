import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';

export const productRepository = {
    findAll(params: {
        skip?: number;
        take?: number;
        search?: string;
        categoryId?: number;
        sort?: string;
    }) {
        const { skip, take, search, categoryId, sort } = params;

        const where: Prisma.ProductWhereInput = {
            deleted_at: null,
            ...(categoryId && { category_id: categoryId }),
            ...(search && {
                name: { contains: search, mode: 'insensitive' }
            })
        };

        let orderBy: Prisma.ProductOrderByWithRelationInput = { created_at: 'desc' };
        if (sort === 'price_asc') {
            orderBy = { price: 'asc' };
        } else if (sort === 'price_desc') {
            orderBy = { price: 'desc' };
        }

        return Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take,
                orderBy,
                include: {
                    category: true,
                    product_images: true,
                    store_inventories: {
                        include: {
                            store: true
                        }
                    }
                }
            }),
            prisma.product.count({ where })
        ]);
    },

    findById(id: number) {
        return prisma.product.findUnique({
            where: { id, deleted_at: null },
            include: {
                category: true,
                product_images: true,
                store_inventories: {
                    include: {
                        store: true
                    }
                }
            }
        });
    },

    findByName(name: string) {
        return prisma.product.findUnique({
            where: { name, deleted_at: null }
        });
    },

    create(data: Prisma.ProductCreateInput, imageUrls: { secureUrl: string; publicId: string }[]) {
        return prisma.product.create({
            data: {
                ...data,
                product_images: {
                    create: imageUrls.map((img, index) => ({
                        image_url: img.secureUrl,
                        public_id: img.publicId,
                        is_primary: index === 0
                    }))
                }
            },
            include: {
                product_images: true
            }
        });
    },

    update(id: number, data: Prisma.ProductUpdateInput, newImages?: { secureUrl: string; publicId: string }[]) {
        return prisma.product.update({
            where: { id },
            data: {
                ...data,
                ...(newImages && newImages.length > 0 && {
                    product_images: {
                        create: newImages.map(img => ({
                            image_url: img.secureUrl,
                            public_id: img.publicId,
                            is_primary: false
                        }))
                    }
                })
            },
            include: {
                product_images: true
            }
        });
    },

    softDelete(id: number) {
        return prisma.product.update({
            where: { id },
            data: { deleted_at: new Date() }
        });
    }
};
