import { voucherService } from '../voucher.service';
import { voucherRepository } from '../../repositories/voucher.repository';
import { AppError } from '../../utils/AppError';
import { discount_type, voucher_type } from '../../../generated/prisma/client';

jest.mock('../../repositories/voucher.repository');
const mockRepo = jest.mocked(voucherRepository);

beforeEach(() => jest.clearAllMocks());

describe('voucherService', () => {
    describe('applyVoucher', () => {
        const mockVoucher = {
            id: '1',
            code: 'TEST10',
            discount_type: discount_type.percentage,
            discount_value: 10,
            usage_type: voucher_type.total_purchase,
            min_purchase_amount: 50000,
            max_discount_amount: 15000,
            expired_at: new Date(Date.now() + 86400000) // Tomorrow
        } as any;

        const applyInput = {
            code: 'TEST10',
            cart_total: 100000,
            store_id: '1'
        };

        it('throws 400 if voucher not found', async () => {
            mockRepo.findByCode.mockResolvedValue(null);
            await expect(voucherService.applyVoucher('1', applyInput)).rejects.toThrow(new AppError('Invalid voucher code', 400));
        });

        it('throws 400 if voucher is expired', async () => {
            mockRepo.findByCode.mockResolvedValue({ ...mockVoucher, expired_at: new Date(Date.now() - 86400000) }); // Yesterday
            await expect(voucherService.applyVoucher('1', applyInput)).rejects.toThrow(new AppError('Voucher has expired', 400));
        });

        it('throws 400 if already used', async () => {
            mockRepo.findByCode.mockResolvedValue(mockVoucher);
            mockRepo.checkUserUsage.mockResolvedValue({ id: '1' } as any);
            await expect(voucherService.applyVoucher('1', applyInput)).rejects.toThrow(new AppError('You have already used this voucher', 400));
        });

        it('throws 400 if min purchase not met', async () => {
            mockRepo.findByCode.mockResolvedValue(mockVoucher);
            mockRepo.checkUserUsage.mockResolvedValue(null);
            await expect(voucherService.applyVoucher('1', { ...applyInput, cart_total: 40000 })).rejects.toThrow(new AppError('Minimum purchase amount not met', 400));
        });

        it('calculates correct percentage discount bounded by max', async () => {
            mockRepo.findByCode.mockResolvedValue(mockVoucher);
            mockRepo.checkUserUsage.mockResolvedValue(null);

            // 10% of 200,000 = 20,000, but max is 15,000
            const result = await voucherService.applyVoucher('1', { ...applyInput, cart_total: 200000 });
            expect(result.calculatedDiscount).toBe(15000);
        });

        it('calculates correct nominal discount bounded by cart total', async () => {
            mockRepo.findByCode.mockResolvedValue({
                ...mockVoucher,
                discount_type: discount_type.nominal,
                discount_value: 50000,
                min_purchase_amount: null
            });
            mockRepo.checkUserUsage.mockResolvedValue(null);

            const result = await voucherService.applyVoucher('1', { ...applyInput, cart_total: 30000 });
            expect(result.calculatedDiscount).toBe(30000); // Exceeds cart, so discounts exactly 30000
        });

        it('throws 400 if product_specific voucher is used on unauthorized product', async () => {
            mockRepo.findByCode.mockResolvedValue({
                ...mockVoucher,
                usage_type: voucher_type.product_specific,
                product_id: '99'
            });
            mockRepo.checkUserUsage.mockResolvedValue(null);

            await expect(voucherService.applyVoucher('1', { ...applyInput, product_ids: ['1', '2'] })).rejects.toThrow(new AppError('This voucher is not applicable for items in your cart', 400));
        });
    });
});
