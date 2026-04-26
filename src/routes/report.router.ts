import { Router } from 'express';
import { user_role } from '../../generated/prisma/client';
import { reportController } from '../controllers/report.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/zod-request-validation.middleware';
import {
  salesCategoryReportQuerySchema,
  salesMonthlyReportQuerySchema,
  salesProductReportQuerySchema,
  stockHistoryReportQuerySchema,
  stockMonthlyReportQuerySchema
} from '../validators/report.validator';

const reportRouter = Router();

reportRouter.use(authenticate);
reportRouter.use(authorize(user_role.super_admin, user_role.store_admin));

reportRouter.get(
  '/sales/monthly',
  validate(salesMonthlyReportQuerySchema),
  reportController.getSalesMonthly
);
reportRouter.get(
  '/sales/categories',
  validate(salesCategoryReportQuerySchema),
  reportController.getSalesByCategory
);
reportRouter.get(
  '/sales/products',
  validate(salesProductReportQuerySchema),
  reportController.getSalesByProduct
);
reportRouter.get(
  '/stock/monthly',
  validate(stockMonthlyReportQuerySchema),
  reportController.getStockMonthly
);
reportRouter.get(
  '/stock/history',
  validate(stockHistoryReportQuerySchema),
  reportController.getStockHistory
);

export default reportRouter;
