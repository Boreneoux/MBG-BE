import { Prisma, voucher_type } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';
import { GetVouchersQuery } from '../types/voucher';

export const voucherRepository = {
    findAll(query: GetVouchersQuery) {
        const { page = 1, limit = 10, usage_type } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.VoucherWhereInput = {
            deleted_at: null,
            ...(usage_type && { usage_type })
        };

        return prisma.$transaction([
            prisma.voucher.count({ where }),
            prisma.voucher.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: { product: true }
            })
        ]);
    },

    findById(id: number) {
        return prisma.voucher.findUnique({
            where: { id, deleted_at: null },
            include: { product: true }
        });
    },

    findByCode(code: string) {
        return prisma.voucher.findUnique({
            where: { code, deleted_at: null },
            include: { product: true }
        });
    },

    create(data: Prisma.VoucherCreateInput) {
        return prisma.voucher.create({ data });
    },

    update(id: number, data: Prisma.VoucherUpdateInput) {
        return prisma.voucher.update({
            where: { id },
            data
        });
    },

    softDelete(id: number) {
        return prisma.voucher.update({
            where: { id },
            data: { deleted_at: new Date() }
        });
    },

    checkUserUsage(userId: number, voucherId: number) {
        return prisma.userVoucher.findFirst({
            where: { user_id: userId, voucher_id: voucherId }
        });
    },

    recordUsage(userId: number, voucherId: number, orderId: number, tx?: Prisma.TransactionClient) {
        const db = tx || prisma;
        return db.userVoucher.create({
            data: {
                user_id: userId,
                voucher_id: voucherId,
                order_id: orderId,
                is_used: true,
                used_at: new Date()
            }
        });
    }
};
