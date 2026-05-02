import { Prisma } from '../../generated/prisma/client';
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

        return Promise.all([
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

    findById(id: string) {
        return prisma.voucher.findFirst({
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

    update(id: string, data: Prisma.VoucherUpdateInput) {
        return prisma.voucher.update({
            where: { id },
            data
        });
    },

    softDelete(id: string) {
        return prisma.voucher.update({
            where: { id },
            data: { deleted_at: new Date() }
        });
    },

    findByUser(userId: string) {
        return prisma.userVoucher.findMany({
            where: {
                user_id: userId,
                deleted_at: null,
                voucher: { deleted_at: null } // exclude soft-deleted vouchers
            },
            include: {
                voucher: { include: { product: true } }
            },
            orderBy: { created_at: 'desc' }
        });
    },

    findActiveReferralVoucher() {
        return prisma.voucher.findFirst({
            where: { is_referral: true, deleted_at: null, expired_at: { gt: new Date() } }
        });
    },

    findActiveReferrerRewardVoucher() {
        return prisma.voucher.findFirst({
            where: { is_referrer_reward: true, deleted_at: null, expired_at: { gt: new Date() } }
        });
    },

    swapReferralVoucher(id: string) {
        return prisma.$transaction(async (tx) => {
            await tx.voucher.updateMany({
                where: { is_referral: true, deleted_at: null },
                data: { is_referral: false }
            });
            return tx.voucher.update({
                where: { id },
                data: { is_referral: true },
                include: { product: true }
            });
        });
    },

    swapReferrerRewardVoucher(id: string) {
        return prisma.$transaction(async (tx) => {
            await tx.voucher.updateMany({
                where: { is_referrer_reward: true, deleted_at: null },
                data: { is_referrer_reward: false }
            });
            return tx.voucher.update({
                where: { id },
                data: { is_referrer_reward: true },
                include: { product: true }
            });
        });
    },

    checkUserUsage(userId: string, voucherId: string) {
        return prisma.userVoucher.findFirst({
            where: { user_id: userId, voucher_id: voucherId }
        });
    },

    findPromotionVouchers() {
        const now = new Date();
        return prisma.voucher.findMany({
            where: {
                deleted_at: null,
                is_referral: false,
                is_referrer_reward: false,
                expired_at: { gt: now }
            },
            include: { product: true },
            orderBy: { created_at: 'desc' }
        });
    },

    recordUsage(userId: string, voucherId: string, orderId: string, tx?: Prisma.TransactionClient) {
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
