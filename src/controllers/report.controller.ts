import { Request, Response } from 'express';
import { reportService } from '../services/report.service';
import { catchAsync } from '../utils/catch-async';
import {
  SalesCategoryReportQuery,
  SalesMonthlyReportQuery,
  SalesProductReportQuery,
  StockHistoryReportQuery,
  StockMonthlyReportQuery
} from '../types/report';

export const reportController = {
  getSalesMonthly: catchAsync(async (req: Request, res: Response) => {
    const query: SalesMonthlyReportQuery = {
      store_id: req.query.store_id ? Number(req.query.store_id) : undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      sort: req.query.sort === 'asc' ? 'asc' : 'desc',
      sort_by: req.query.sort_by as SalesMonthlyReportQuery['sort_by']
    };

    const result = await reportService.getSalesMonthly(query, req.user!);

    res.json({
      success: true,
      message: 'Sales monthly report retrieved successfully',
      data: result
    });
  }),

  getSalesByCategory: catchAsync(async (req: Request, res: Response) => {
    const query: SalesCategoryReportQuery = {
      store_id: req.query.store_id ? Number(req.query.store_id) : undefined,
      category_id: req.query.category_id ? Number(req.query.category_id) : undefined,
      search: req.query.search as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      sort: req.query.sort === 'asc' ? 'asc' : 'desc',
      sort_by: req.query.sort_by as SalesCategoryReportQuery['sort_by']
    };

    const result = await reportService.getSalesByCategory(query, req.user!);

    res.json({
      success: true,
      message: 'Sales by category report retrieved successfully',
      data: result
    });
  }),

  getSalesByProduct: catchAsync(async (req: Request, res: Response) => {
    const query: SalesProductReportQuery = {
      store_id: req.query.store_id ? Number(req.query.store_id) : undefined,
      category_id: req.query.category_id ? Number(req.query.category_id) : undefined,
      product_id: req.query.product_id ? Number(req.query.product_id) : undefined,
      search: req.query.search as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      sort: req.query.sort === 'asc' ? 'asc' : 'desc',
      sort_by: req.query.sort_by as SalesProductReportQuery['sort_by']
    };

    const result = await reportService.getSalesByProduct(query, req.user!);

    res.json({
      success: true,
      message: 'Sales by product report retrieved successfully',
      data: result
    });
  }),

  getStockMonthly: catchAsync(async (req: Request, res: Response) => {
    const query: StockMonthlyReportQuery = {
      store_id: req.query.store_id ? Number(req.query.store_id) : undefined,
      product_id: req.query.product_id ? Number(req.query.product_id) : undefined,
      type: req.query.type as StockMonthlyReportQuery['type'],
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      sort: req.query.sort === 'asc' ? 'asc' : 'desc',
      sort_by: req.query.sort_by as StockMonthlyReportQuery['sort_by']
    };

    const result = await reportService.getStockMonthly(query, req.user!);

    res.json({
      success: true,
      message: 'Stock monthly report retrieved successfully',
      data: result
    });
  }),

  getStockHistory: catchAsync(async (req: Request, res: Response) => {
    const query: StockHistoryReportQuery = {
      store_id: req.query.store_id ? Number(req.query.store_id) : undefined,
      product_id: req.query.product_id ? Number(req.query.product_id) : undefined,
      category_id: req.query.category_id ? Number(req.query.category_id) : undefined,
      type: req.query.type as StockHistoryReportQuery['type'],
      search: req.query.search as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      sort: req.query.sort === 'asc' ? 'asc' : 'desc',
      sort_by: req.query.sort_by as StockHistoryReportQuery['sort_by']
    };

    const result = await reportService.getStockHistory(query, req.user!);

    res.json({
      success: true,
      message: 'Stock history report retrieved successfully',
      data: result
    });
  })
};
