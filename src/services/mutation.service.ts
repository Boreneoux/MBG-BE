import { AppError } from '../utils/AppError';
import mutationRepository from '../repositories/mutation.repository';
import inventoryRepository from '../repositories/inventory.repository';
import { prisma } from '../config/prisma-client.config';
import { Prisma } from '../../generated/prisma/client';

export const mutationService = {
    async createMutation(input: { source_store_id: string; destination_store_id: string; product_id: string; quantity: number }) {
        if (input.source_store_id === input.destination_store_id) {
            throw new AppError('Source and destination stores must be different', 400);
        }

        const sourceStore = await inventoryRepository.findStoreById(input.source_store_id);
        const destStore = await inventoryRepository.findStoreById(input.destination_store_id);
        if (!sourceStore || !destStore) throw new AppError('Store not found', 404);

        const product = await inventoryRepository.findProductById(input.product_id);
        if (!product) throw new AppError('Product not found', 404);

        // Ensure both inventories exist
        const sourceInventory = await inventoryRepository.upsertInventory(input.source_store_id, input.product_id);
        const destInventory = await inventoryRepository.upsertInventory(input.destination_store_id, input.product_id);

        if (sourceInventory.stock < input.quantity) {
            throw new AppError(`Insufficient stock in source store. Current: ${sourceInventory.stock}, Requested: ${input.quantity}`, 400);
        }

        const result = await prisma.$transaction(async (tx) => {
            // Deduct from source
            const updatedSourceInv = await tx.storeInventory.update({
                where: { id: sourceInventory.id },
                data: { stock: sourceInventory.stock - input.quantity, updated_at: new Date() }
            });
            await tx.stockJournal.create({
                data: {
                    store_inventory_id: sourceInventory.id,
                    quantity: input.quantity,
                    type: 'mutation_out',
                    description: `Mutation to store ${destStore.name}`
                }
            });

            // Add to destination
            const updatedDestInv = await tx.storeInventory.update({
                where: { id: destInventory.id },
                data: { stock: destInventory.stock + input.quantity, updated_at: new Date() }
            });
            await tx.stockJournal.create({
                data: {
                    store_inventory_id: destInventory.id,
                    quantity: input.quantity,
                    type: 'mutation_in',
                    description: `Mutation from store ${sourceStore.name}`
                }
            });

            // Create mutation record
            const mutation = await tx.stockMutation.create({
                data: {
                    source_store_id: input.source_store_id,
                    destination_store_id: input.destination_store_id,
                    product_id: input.product_id,
                    quantity: input.quantity,
                    status: 'completed'
                }
            });

            return mutation;
        });

        return result;
    },

    async getMutations(query: { page?: string; limit?: string; sort?: 'asc' | 'desc'; search?: string }) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const sort = query.sort ?? 'desc';

        const skip = (page - 1) * limit;
        const search = query.search?.trim();

        let where: Prisma.StockMutationWhereInput | undefined = undefined;
        if (search) {
            where = {
                OR: [
                    { product: { name: { contains: search, mode: 'insensitive' } } },
                    { source_store: { name: { contains: search, mode: 'insensitive' } } },
                    { destination_store: { name: { contains: search, mode: 'insensitive' } } },
                ]
            };
        }

        const [mutations, total] = await Promise.all([
            mutationRepository.findMutations({ skip, take: limit, sort, where }),
            mutationRepository.countMutations(where)
        ]);

        return {
            mutations,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
};
