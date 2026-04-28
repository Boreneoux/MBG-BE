import { voucherRepository } from '../repositories/voucher.repository';
import { AppError } from '../utils/AppError';
import { CreateVoucherInput, GetVouchersQuery, ApplyVoucherInput } from '../types/voucher';

export const voucherService = {
    async getVouchers(query: GetVouchersQuery) {
        const [total, data] = await voucherRepository.findAll(query);
        const { page = 1, limit = 10 } = query;

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    async getVoucherById(id: string) {
        const voucher = await voucherRepository.findById(id);
        if (!voucher) {
            throw new AppError('Voucher not found', 404);
        }
        return voucher;
    },

    async createVoucher(data: CreateVoucherInput) {
        const existing = await voucherRepository.findByCode(data.code);
        if (existing) {
            throw new AppError('Voucher with this code already exists', 400);
        }

        return await voucherRepository.create({
            code: data.code,
            discount_type: data.discount_type,
            discount_value: data.discount_value,
            max_discount_amount: data.max_discount_amount,
            min_purchase_amount: data.min_purchase_amount,
            usage_type: data.usage_type,
            expired_at: new Date(data.expired_at),
            ...(data.product_id && { product: { connect: { id: data.product_id } } })
        });
    },

    async updateVoucher(id: string, data: Partial<CreateVoucherInput>) {
        const voucher = await voucherRepository.findById(id);
        if (!voucher) {
            throw new AppError('Voucher not found', 404);
        }

        if (data.code && data.code !== voucher.code) {
            const existing = await voucherRepository.findByCode(data.code);
            if (existing) {
                throw new AppError('Voucher code already exists', 400);
            }
        }

        const updateData: any = { ...data };
        if (data.expired_at) {
            updateData.expired_at = new Date(data.expired_at);
        }

        if (data.product_id !== undefined) {
            if (data.product_id === null) {
                updateData.product = { disconnect: true };
            } else {
                updateData.product = { connect: { id: data.product_id } };
            }
            delete updateData.product_id;
        }

        return await voucherRepository.update(id, updateData);
    },

    async getUserVouchers(userId: string) {
        return voucherRepository.findByUser(userId);
    },

    async setAsReferrerRewardVoucher(id: string) {
        const voucher = await voucherRepository.findById(id);
        if (!voucher) {
            throw new AppError('Voucher not found', 404);
        }
        if (new Date(voucher.expired_at) < new Date()) {
            throw new AppError('Cannot set an expired voucher as the referrer reward voucher', 400);
        }
        return voucherRepository.swapReferrerRewardVoucher(id);
    },

    async setAsReferralVoucher(id: string) {
        const voucher = await voucherRepository.findById(id);
        if (!voucher) {
            throw new AppError('Voucher not found', 404);
        }
        if (new Date(voucher.expired_at) < new Date()) {
            throw new AppError('Cannot set an expired voucher as the referral voucher', 400);
        }
        return voucherRepository.swapReferralVoucher(id);
    },

    async deleteVoucher(id: string) {
        const voucher = await voucherRepository.findById(id);
        if (!voucher) {
            throw new AppError('Voucher not found', 404);
        }
        return voucherRepository.softDelete(id);
    },

    async applyVoucher(userId: string, applyData: ApplyVoucherInput) {
        const voucher = await voucherRepository.findByCode(applyData.code);

        if (!voucher) {
            throw new AppError('Invalid voucher code', 400);
        }

        if (new Date(voucher.expired_at) < new Date()) {
            throw new AppError('Voucher has expired', 400);
        }

        const usage = await voucherRepository.checkUserUsage(userId, voucher.id);
        if (usage) {
            throw new AppError('You have already used this voucher', 400);
        }

        if (voucher.min_purchase_amount && applyData.cart_total < Number(voucher.min_purchase_amount)) {
            throw new AppError(`Minimum purchase amount not met`, 400);
        }

        if (voucher.usage_type === 'product_specific') {
            if (!applyData.product_ids || !applyData.product_ids.includes(voucher.product_id!)) {
                throw new AppError('This voucher is not applicable for items in your cart', 400);
            }
        }

        let calculatedDiscount = 0;
        if (voucher.discount_type === 'percentage') {
            calculatedDiscount = applyData.cart_total * (Number(voucher.discount_value) / 100);
            if (voucher.max_discount_amount && calculatedDiscount > Number(voucher.max_discount_amount)) {
                calculatedDiscount = Number(voucher.max_discount_amount);
            }
        } else if (voucher.discount_type === 'nominal') {
            calculatedDiscount = Number(voucher.discount_value);
            if (calculatedDiscount > applyData.cart_total) {
                calculatedDiscount = applyData.cart_total;
            }
        }

        return {
            voucher,
            calculatedDiscount
        };
    }
};
