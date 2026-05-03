import { prisma } from '../config/prisma-client.config';
import { Prisma } from '../../generated/prisma/client';

class MutationRepository {
    async findMutations(params: { skip: number; take: number; sort: 'asc' | 'desc', where?: Prisma.StockMutationWhereInput }) {
        return prisma.stockMutation.findMany({
            where: params.where,
            skip: params.skip,
            take: params.take,
            orderBy: { created_at: params.sort },
            include: {
                source_store: { select: { id: true, name: true } },
                destination_store: { select: { id: true, name: true } },
                product: { select: { id: true, name: true, price: true, slug: true } },
            },
        });
    }

    async countMutations(where?: Prisma.StockMutationWhereInput) {
        return prisma.stockMutation.count({ where });
    }
}

export default new MutationRepository();
