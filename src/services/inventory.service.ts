import { AppError } from '../utils/AppError';
import inventoryRepository from '../repositories/inventory.repository';
import { AdjustStockInput, JournalQueryInput, InventoryQueryInput, CreateInventoryInput } from '../types/inventory';
import { JwtPayload } from '../middlewares/auth.middleware';
import { Prisma, stock_journal_type } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';

export const inventoryService = {
    async createInventory(input: CreateInventoryInput, user: JwtPayload) {
        let storeId: number;

        if (user.role === 'store_admin') {
            const storeAdmin = await inventoryRepository.findStoreAdminByUserId(user.id);
            if (!storeAdmin) throw new AppError('Store admin is not assigned to any store', 400);
            storeId = storeAdmin.store_id;
        } else {
            if (!input.store_id) throw new AppError('store_id is required for super admin', 400);
            storeId = input.store_id;
        }

        const store = await inventoryRepository.findStoreById(storeId);
        if (!store) throw new AppError('Store not found', 404);

        const product = await inventoryRepository.findProductById(input.product_id);
        if (!product) throw new AppError('Product not found', 404);

        // Check if it already exists to avoid conflict
        const existing = await inventoryRepository.findInventory(storeId, input.product_id);
        if (existing) throw new AppError('Inventory for this product already exists in this store', 409);

        const result = await inventoryRepository.createInventoryWithStock(
            storeId,
            input.product_id,
            input.initial_stock,
            input.description
        );

        return {
            inventory: {
                ...result.inventory,
                store: { id: store.id, name: store.name },
                product: { id: product.id, name: product.name },
            },
            journal: result.journal,
        };
    },

    async deleteInventory(id: number, user: JwtPayload) {
        const inventory = await inventoryRepository.findInventoryById(id);
        if (!inventory) throw new AppError('Inventory not found', 404);

        // If store admin, ensure they own this inventory
        if (user.role === 'store_admin') {
            const storeAdmin = await inventoryRepository.findStoreAdminByUserId(user.id);
            if (!storeAdmin || storeAdmin.store_id !== inventory.store_id) {
                throw new AppError('Forbidden: You can only delete inventory for your assigned store', 403);
            }
        }

        await inventoryRepository.softDeleteInventory(id);
        return null;
    },

    async adjustStock(input: AdjustStockInput, user: JwtPayload) {
        let storeId: number;

        if (user.role === 'store_admin') {
            // Auto-resolve store from StoreAdmin assignment — ignore any client-provided store_id
            const storeAdmin = await inventoryRepository.findStoreAdminByUserId(user.id);
            if (!storeAdmin) throw new AppError('Store admin is not assigned to any store', 400);
            storeId = storeAdmin.store_id;
        } else {
            // super_admin must supply store_id explicitly
            if (!input.store_id) throw new AppError('store_id is required for super admin', 400);
            storeId = input.store_id;
        }

        const store = await inventoryRepository.findStoreById(storeId);
        if (!store) throw new AppError('Store not found', 404);

        const product = await inventoryRepository.findProductById(input.product_id);
        if (!product) throw new AppError('Product not found', 404);

        // Ensure inventory row exists (creates with stock=0 if missing)
        const inventory = await inventoryRepository.upsertInventory(storeId, input.product_id);

        const delta = input.type === 'addition' ? input.quantity : -input.quantity;
        const newStock = inventory.stock + delta;

        if (newStock < 0) {
            throw new AppError(
                `Insufficient stock. Current: ${inventory.stock}, requested reduction: ${input.quantity}`,
                400
            );
        }

        // Transaction: create journal entry first, then update stock atomically
        const [journal, updatedInventory] = await prisma.$transaction(async (tx) => {
            const j = await tx.stockJournal.create({
                data: {
                    store_inventory_id: inventory.id,
                    quantity: input.quantity,
                    type: input.type as stock_journal_type,
                    description: input.description,
                },
            });
            const inv = await tx.storeInventory.update({
                where: { id: inventory.id },
                data: { stock: newStock, updated_at: new Date() },
            });
            return [j, inv] as const;
        });

        return {
            inventory: {
                ...updatedInventory,
                store: { id: store.id, name: store.name },
                product: { id: product.id, name: product.name },
            },
            journal,
        };
    },

    async createJournal(input: AdjustStockInput & { type: stock_journal_type }, user: JwtPayload) {
        let storeId: number;

        if (user.role === 'store_admin') {
            const storeAdmin = await inventoryRepository.findStoreAdminByUserId(user.id);
            if (!storeAdmin) throw new AppError('Store admin is not assigned to any store', 400);
            storeId = storeAdmin.store_id;
        } else {
            if (!input.store_id) throw new AppError('store_id is required for super admin', 400);
            storeId = input.store_id;
        }

        const store = await inventoryRepository.findStoreById(storeId);
        if (!store) throw new AppError('Store not found', 404);

        const product = await inventoryRepository.findProductById(input.product_id);
        if (!product) throw new AppError('Product not found', 404);

        const inventory = await inventoryRepository.upsertInventory(storeId, input.product_id);

        let newStock = inventory.stock;
        if (input.type === 'addition') {
            newStock += input.quantity;
        } else if (input.type === 'reduction') {
            if (newStock < input.quantity) {
                throw new AppError(
                    `Insufficient stock. Current: ${newStock}, requested reduction: ${input.quantity}`,
                    400
                );
            }
            newStock -= input.quantity;
        }
        // For other types, don't update stock

        const journal = await prisma.stockJournal.create({
            data: {
                store_inventory_id: inventory.id,
                quantity: input.quantity,
                type: input.type,
                description: input.description,
            },
        });

        let updatedInventory = inventory;
        if (input.type === 'addition' || input.type === 'reduction') {
            updatedInventory = await prisma.storeInventory.update({
                where: { id: inventory.id },
                data: { stock: newStock, updated_at: new Date() },
            });
        }

        return {
            inventory: {
                ...updatedInventory,
                store: { id: store.id, name: store.name },
                product: { id: product.id, name: product.name },
            },
            journal,
        };
    },

    async getJournals(query: JournalQueryInput, user: JwtPayload) {
        let storeId: number | undefined = query.store_id;

        if (user.role === 'store_admin') {
            const storeAdmin = await inventoryRepository.findStoreAdminByUserId(user.id);
            if (!storeAdmin) throw new AppError('Store admin is not assigned to any store', 400);
            storeId = storeAdmin.store_id; // always override — ignore client-provided value
        }

        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const sort = query.sort ?? 'desc';

        // Build nested where for store_inventory relation filters
        const inventoryWhere: Prisma.StoreInventoryWhereInput = {
            ...(storeId !== undefined && { store_id: storeId }),
            ...(query.product_id !== undefined && { product_id: query.product_id }),
        };

        const where: Prisma.StockJournalWhereInput = {
            deleted_at: null,
            ...(Object.keys(inventoryWhere).length > 0 && { store_inventory: inventoryWhere }),
            ...(query.type !== undefined && { type: query.type }),
            ...((query.from !== undefined || query.to !== undefined) && {
                created_at: {
                    ...(query.from && { gte: new Date(query.from) }),
                    ...(query.to && { lte: new Date(query.to) }),
                },
            }),
        };

        const [journals, total] = await Promise.all([
            inventoryRepository.findJournals({
                where,
                orderBy: { created_at: sort },
                skip: (page - 1) * limit,
                take: limit,
            }),
            inventoryRepository.countJournals(where),
        ]);

        return {
            journals,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },

    async getInventories(query: InventoryQueryInput, user: JwtPayload) {
        let storeId: number | undefined = query.store_id;

        if (user.role === 'store_admin') {
            const storeAdmin = await inventoryRepository.findStoreAdminByUserId(user.id);
            if (!storeAdmin) throw new AppError('Store admin is not assigned to any store', 400);
            storeId = storeAdmin.store_id;
        }

        const where: Prisma.StoreInventoryWhereInput = {
            ...(storeId !== undefined && { store_id: storeId }),
            ...(query.product_id !== undefined && { product_id: query.product_id }),
        };

        const inventories = await inventoryRepository.findInventories({ where });
        return { inventories };
    },
};
