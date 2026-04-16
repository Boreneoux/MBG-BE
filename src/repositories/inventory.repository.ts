import { prisma } from '../config/prisma-client.config';
import { stock_journal_type, Prisma } from '../../generated/prisma/client';

const inventoryRepository = {
    findInventory(storeId: number, productId: number) {
        return prisma.storeInventory.findUnique({
            where: {
                store_id_product_id: { store_id: storeId, product_id: productId },
                deleted_at: null,
            },
        });
    },

    findInventoryById(id: number) {
        return prisma.storeInventory.findUnique({
            where: { id, deleted_at: null },
            include: {
                store: { select: { id: true, name: true } },
                product: { select: { id: true, name: true, slug: true } },
            },
        });
    },

    async createInventoryWithStock(
        storeId: number,
        productId: number,
        initialStock: number,
        journalDescription?: string
    ) {
        return prisma.$transaction(async (tx) => {
            const inventory = await tx.storeInventory.create({
                data: { store_id: storeId, product_id: productId, stock: initialStock },
            });
            const journal = await tx.stockJournal.create({
                data: {
                    store_inventory_id: inventory.id,
                    quantity: initialStock,
                    type: 'addition',
                    description: journalDescription ?? 'Initial stock creation',
                },
            });
            return { inventory, journal };
        });
    },

    softDeleteInventory(id: number) {
        return prisma.storeInventory.update({
            where: { id },
            data: { deleted_at: new Date() },
        });
    },

    upsertInventory(storeId: number, productId: number) {
        return prisma.storeInventory.upsert({
            where: {
                store_id_product_id: { store_id: storeId, product_id: productId },
            },
            create: { store_id: storeId, product_id: productId, stock: 0 },
            update: {},
        });
    },

    updateStock(inventoryId: number, newStock: number) {
        return prisma.storeInventory.update({
            where: { id: inventoryId },
            data: { stock: newStock, updated_at: new Date() },
        });
    },

    createJournal(data: {
        store_inventory_id: number;
        quantity: number;
        type: stock_journal_type;
        description?: string;
        reference_id?: number;
    }) {
        return prisma.stockJournal.create({ data });
    },

    findJournals(params: {
        where: Prisma.StockJournalWhereInput;
        orderBy: Prisma.StockJournalOrderByWithRelationInput;
        skip: number;
        take: number;
    }) {
        return prisma.stockJournal.findMany({
            where: params.where,
            orderBy: params.orderBy,
            skip: params.skip,
            take: params.take,
            include: {
                store_inventory: {
                    include: {
                        store: { select: { id: true, name: true } },
                        product: { select: { id: true, name: true, slug: true } },
                    },
                },
            },
        });
    },

    countJournals(where: Prisma.StockJournalWhereInput) {
        return prisma.stockJournal.count({ where });
    },

    findInventories(params: {
        where: Prisma.StoreInventoryWhereInput;
    }) {
        return prisma.storeInventory.findMany({
            where: { ...params.where, deleted_at: null },
            include: {
                store: { select: { id: true, name: true } },
                product: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        price: true,
                        product_images: {
                            where: { is_primary: true, deleted_at: null },
                            select: { image_url: true },
                            take: 1,
                        },
                    },
                },
            },
            orderBy: [{ store_id: 'asc' }, { product_id: 'asc' }],
        });
    },

    findStoreAdminByUserId(userId: number) {
        return prisma.storeAdmin.findFirst({
            where: { user_id: userId, deleted_at: null },
            select: { store_id: true },
        });
    },

    findStoreById(storeId: number) {
        return prisma.store.findUnique({
            where: { id: storeId, deleted_at: null },
            select: { id: true, name: true },
        });
    },

    findProductById(productId: number) {
        return prisma.product.findUnique({
            where: { id: productId, deleted_at: null },
            select: { id: true, name: true },
        });
    },
};

export default inventoryRepository;
