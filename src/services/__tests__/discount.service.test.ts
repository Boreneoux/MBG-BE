import { discountService } from '../discount.service';
import { discountRepository } from '../../repositories/discount.repository';
import { AppError } from '../../utils/AppError';
import { discount_type } from '../../../generated/prisma/client';

jest.mock('../../repositories/discount.repository');
const mockRepo = jest.mocked(discountRepository);

beforeEach(() => jest.clearAllMocks());

describe('discountService', () => {
    describe('createDiscount', () => {
        it('should call repository.create with correct data', async () => {
            const input = {
                store_id: '1',
                type: discount_type.percentage,
                value: 10,
                min_purchase_amount: 50000,
                product_id: '2'
            };
            mockRepo.create.mockResolvedValue({ id: '1', ...input } as any);

            const result = await discountService.createDiscount(input);

            expect(mockRepo.create).toHaveBeenCalledWith({
                type: 'percentage',
                value: 10,
                min_purchase_amount: 50000,
                max_discount_value: undefined,
                started_at: null,
                expired_at: null,
                store: { connect: { id: '1' } },
                product: { connect: { id: '2' } }
            });
            expect(result.id).toBe('1');
        });
    });

    describe('updateDiscount', () => {
        it('throws 404 if discount not found', async () => {
            mockRepo.findById.mockResolvedValue(null);
            await expect(discountService.updateDiscount('99', { is_active: false })).rejects.toThrow(new AppError('Discount not found', 404));
        });

        it('updates discount fields correctly', async () => {
            mockRepo.findById.mockResolvedValue({ id: '1' } as any);
            mockRepo.update.mockResolvedValue({ id: '1', is_active: false } as any);

            await discountService.updateDiscount('1', { is_active: false, value: 20 });

            expect(mockRepo.update).toHaveBeenCalledWith('1', { is_active: false, value: 20 });
        });
    });

    describe('deleteDiscount', () => {
        it('throws 404 if not found', async () => {
            mockRepo.findById.mockResolvedValue(null);
            await expect(discountService.deleteDiscount('99')).rejects.toThrow(new AppError('Discount not found', 404));
        });

        it('calls softDelete on repo', async () => {
            mockRepo.findById.mockResolvedValue({ id: '1' } as any);
            mockRepo.softDelete.mockResolvedValue({ id: '1', deleted_at: new Date() } as any);
            await discountService.deleteDiscount('1');
            expect(mockRepo.softDelete).toHaveBeenCalledWith('1');
        });
    });
});
