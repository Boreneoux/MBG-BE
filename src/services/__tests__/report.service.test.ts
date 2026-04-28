import { reportService } from '../report.service';
import { reportRepository } from '../../repositories/report.repository';
import { AppError } from '../../utils/AppError';

jest.mock('../../repositories/report.repository', () => ({
  reportRepository: {
    findStoreAdminByUserId: jest.fn(),
    findStoreById: jest.fn(),
    getSalesMonthlySummary: jest.fn(),
    getSalesByCategory: jest.fn(),
    getSalesByProduct: jest.fn(),
    getStockMonthlySummary: jest.fn(),
    getStockHistory: jest.fn()
  }
}));

const mockRepository = jest.mocked(reportRepository);

beforeEach(() => jest.clearAllMocks());

describe('reportService', () => {
  describe('getSalesMonthly', () => {
    it('scopes store admin to their assigned store', async () => {
      mockRepository.findStoreAdminByUserId.mockResolvedValue({ store_id: '7' });
      mockRepository.getSalesMonthlySummary.mockResolvedValue({
        rows: [{ month: '2026-04', total_sales: 100000, total_orders: 4, total_items: 8 }],
        total: 1
      });

      const result = await reportService.getSalesMonthly(
        { store_id: '99', page: 1, limit: 10 },
        { id: '10', email: 'store@test.com', role: 'store_admin' }
      );

      expect(mockRepository.getSalesMonthlySummary).toHaveBeenCalledWith(
        expect.objectContaining({ store_id: '7' }),
        expect.objectContaining({ page: 1, limit: 10, skip: 0 })
      );
      expect(result.meta.total).toBe(1);
    });

    it('throws when store admin has no assigned store', async () => {
      mockRepository.findStoreAdminByUserId.mockResolvedValue(null);

      await expect(
        reportService.getSalesMonthly(
          {},
          { id: '11', email: 'store@test.com', role: 'store_admin' }
        )
      ).rejects.toThrow(new AppError('Store admin is not assigned to any store', 400));
    });

    it('validates provided store for super admin', async () => {
      mockRepository.findStoreById.mockResolvedValue(null);

      await expect(
        reportService.getSalesMonthly(
          { store_id: '88' },
          { id: '1', email: 'super@test.com', role: 'super_admin' }
        )
      ).rejects.toThrow(new AppError('Store not found', 404));
    });
  });

  describe('getStockHistory', () => {
    it('rejects invalid date ranges', async () => {
      await expect(
        reportService.getStockHistory(
          { from: '2026-05-01', to: '2026-04-01' },
          { id: '1', email: 'super@test.com', role: 'super_admin' }
        )
      ).rejects.toThrow(new AppError('from must be earlier than or equal to to', 400));
    });
  });
});
