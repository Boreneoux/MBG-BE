import logger from '../config/logger.config';
import { JwtPayload } from '../middlewares/auth.middleware';
import { reportRepository } from '../repositories/report.repository';
import {
  SalesCategoryReportQuery,
  SalesMonthlyReportQuery,
  SalesProductReportQuery,
  StockHistoryReportQuery,
  StockMonthlyReportQuery
} from '../types/report';
import { AppError } from '../utils/AppError';

const normalizePagination = (page = 1, limit = 10) => {
  const safePage = page > 0 ? page : 1;
  const safeLimit = limit > 0 ? limit : 10;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit
  };
};

const createMeta = (total: number, page: number, limit: number) => ({
  total,
  page,
  limit,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit)
});

const resolveStoreScope = async (
  user: JwtPayload,
  requestedStoreId?: string
): Promise<string | undefined> => {
  if (user.role === 'store_admin') {
    const storeAdmin = await reportRepository.findStoreAdminByUserId(user.id);
    if (!storeAdmin) {
      throw new AppError('Store admin is not assigned to any store', 400);
    }

    return storeAdmin.store_id;
  }

  if (requestedStoreId !== undefined) {
    const store = await reportRepository.findStoreById(requestedStoreId);
    if (!store) {
      throw new AppError('Store not found', 404);
    }
  }

  return requestedStoreId;
};

const ensureValidDateRange = (from?: string, to?: string) => {
  if (from && to && new Date(from) > new Date(to)) {
    throw new AppError('from must be earlier than or equal to to', 400);
  }
};

export const reportService = {
  async getSalesMonthly(query: SalesMonthlyReportQuery, user: JwtPayload) {
    ensureValidDateRange(query.from, query.to);

    const scopedStoreId = await resolveStoreScope(user, query.store_id);
    const pagination = normalizePagination(query.page, query.limit);
    const normalizedQuery: SalesMonthlyReportQuery = {
      ...query,
      store_id: scopedStoreId
    };

    logger.debug(
      `Generating sales monthly report for user ${user.id} with store scope ${scopedStoreId ?? 'all'}`
    );

    const result = await reportRepository.getSalesMonthlySummary(normalizedQuery, pagination);

    return {
      items: result.rows,
      meta: createMeta(result.total, pagination.page, pagination.limit)
    };
  },

  async getSalesByCategory(query: SalesCategoryReportQuery, user: JwtPayload) {
    ensureValidDateRange(query.from, query.to);

    const scopedStoreId = await resolveStoreScope(user, query.store_id);
    const pagination = normalizePagination(query.page, query.limit);
    const normalizedQuery: SalesCategoryReportQuery = {
      ...query,
      store_id: scopedStoreId
    };

    logger.debug(
      `Generating category sales report for user ${user.id} with store scope ${scopedStoreId ?? 'all'}`
    );

    const result = await reportRepository.getSalesByCategory(normalizedQuery, pagination);

    return {
      items: result.rows,
      meta: createMeta(result.total, pagination.page, pagination.limit)
    };
  },

  async getSalesByProduct(query: SalesProductReportQuery, user: JwtPayload) {
    ensureValidDateRange(query.from, query.to);

    const scopedStoreId = await resolveStoreScope(user, query.store_id);
    const pagination = normalizePagination(query.page, query.limit);
    const normalizedQuery: SalesProductReportQuery = {
      ...query,
      store_id: scopedStoreId
    };

    logger.debug(
      `Generating product sales report for user ${user.id} with store scope ${scopedStoreId ?? 'all'}`
    );

    const result = await reportRepository.getSalesByProduct(normalizedQuery, pagination);

    return {
      items: result.rows,
      meta: createMeta(result.total, pagination.page, pagination.limit)
    };
  },

  async getStockMonthly(query: StockMonthlyReportQuery, user: JwtPayload) {
    ensureValidDateRange(query.from, query.to);

    const scopedStoreId = await resolveStoreScope(user, query.store_id);
    const pagination = normalizePagination(query.page, query.limit);
    const normalizedQuery: StockMonthlyReportQuery = {
      ...query,
      store_id: scopedStoreId
    };

    logger.debug(
      `Generating stock monthly report for user ${user.id} with store scope ${scopedStoreId ?? 'all'}`
    );

    const result = await reportRepository.getStockMonthlySummary(normalizedQuery, pagination);

    return {
      items: result.rows,
      meta: createMeta(result.total, pagination.page, pagination.limit)
    };
  },

  async getStockHistory(query: StockHistoryReportQuery, user: JwtPayload) {
    ensureValidDateRange(query.from, query.to);

    const scopedStoreId = await resolveStoreScope(user, query.store_id);
    const pagination = normalizePagination(query.page, query.limit);
    const normalizedQuery: StockHistoryReportQuery = {
      ...query,
      store_id: scopedStoreId
    };

    logger.debug(
      `Generating stock history report for user ${user.id} with store scope ${scopedStoreId ?? 'all'}`
    );

    const result = await reportRepository.getStockHistory(normalizedQuery, pagination);

    return {
      items: result.rows,
      meta: createMeta(result.total, pagination.page, pagination.limit)
    };
  }
};
