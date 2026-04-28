import { stock_journal_type } from '../../generated/prisma/client';

export interface BaseReportQuery {
  store_id?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sort?: 'asc' | 'desc';
}

export interface SalesMonthlyReportQuery extends BaseReportQuery {
  sort_by?: 'month' | 'total_sales' | 'total_orders' | 'total_items';
}

export interface SalesCategoryReportQuery extends BaseReportQuery {
  category_id?: string;
  search?: string;
  sort_by?: 'category_name' | 'total_sales' | 'total_quantity' | 'total_orders';
}

export interface SalesProductReportQuery extends BaseReportQuery {
  category_id?: string;
  product_id?: string;
  search?: string;
  sort_by?:
    | 'product_name'
    | 'category_name'
    | 'total_sales'
    | 'total_quantity'
    | 'total_orders';
}

export interface StockMonthlyReportQuery extends BaseReportQuery {
  product_id?: string;
  type?: stock_journal_type;
  sort_by?: 'month' | 'total_in' | 'total_out' | 'net_change' | 'total_entries';
}

export interface StockHistoryReportQuery extends BaseReportQuery {
  product_id?: string;
  category_id?: string;
  type?: stock_journal_type;
  search?: string;
  sort_by?: 'created_at' | 'quantity' | 'type' | 'product_name' | 'category_name';
}
