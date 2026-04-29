import { Prisma, stock_journal_type } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';
import {
  SalesCategoryReportQuery,
  SalesMonthlyReportQuery,
  SalesProductReportQuery,
  StockHistoryReportQuery,
  StockMonthlyReportQuery
} from '../types/report';

const SALES_STATUSES = ['processing', 'shipped', 'confirmed'] as const;
const STOCK_IN_TYPES: stock_journal_type[] = [
  'addition',
  'mutation_in',
  'order_cancellation_return'
];
const STOCK_OUT_TYPES: stock_journal_type[] = [
  'reduction',
  'mutation_out',
  'order_deduction'
];

type Pagination = {
  skip: number;
  take: number;
};

const buildDateFilters = (
  alias: string,
  from?: string,
  to?: string
): Prisma.Sql[] => {
  const filters: Prisma.Sql[] = [];

  if (from) {
    filters.push(Prisma.sql`${Prisma.raw(alias)} >= ${new Date(from)}`);
  }

  if (to) {
    filters.push(Prisma.sql`${Prisma.raw(alias)} <= ${new Date(to)}`);
  }

  return filters;
};

const whereClause = (filters: Prisma.Sql[]) =>
  filters.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`
    : Prisma.empty;

const buildOrderBy = <T extends string>(
  sortBy: T,
  sort: 'asc' | 'desc',
  mapping: Record<T, string>
) => Prisma.sql`ORDER BY ${Prisma.raw(mapping[sortBy])} ${Prisma.raw(sort.toUpperCase())}`;

export const reportRepository = {
  findStoreAdminByUserId(userId: string) {
    return prisma.storeAdmin.findFirst({
      where: { user_id: userId, deleted_at: null },
      select: { store_id: true }
    });
  },

  findStoreById(storeId: string) {
    return prisma.store.findFirst({
      where: { id: storeId, deleted_at: null },
      select: { id: true, name: true }
    });
  },

  async getSalesMonthlySummary(
    query: SalesMonthlyReportQuery,
    pagination: Pagination
  ) {
    const filters: Prisma.Sql[] = [
      Prisma.sql`o.deleted_at IS NULL`,
      Prisma.sql`o.status IN (${Prisma.join(
        SALES_STATUSES.map((status) => Prisma.sql`${status}`)
      )})`
    ];

    if (query.store_id !== undefined) {
      filters.push(Prisma.sql`o.store_id = ${query.store_id}`);
    }

    filters.push(...buildDateFilters('o.created_at', query.from, query.to));

    const where = whereClause(filters);
    const orderBy = buildOrderBy(query.sort_by ?? 'month', query.sort ?? 'desc', {
      month: 'month',
      total_sales: 'total_sales',
      total_orders: 'total_orders',
      total_items: 'total_items'
    });

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          month: string;
          total_sales: number;
          total_orders: number;
          total_items: number;
        }>
      >(Prisma.sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', o.created_at), 'YYYY-MM') AS month,
          COALESCE(SUM(o.total_price), 0)::float8 AS total_sales,
          COUNT(o.id)::int AS total_orders,
          COALESCE(SUM(item_summary.total_items), 0)::int AS total_items
        FROM orders o
        LEFT JOIN (
          SELECT
            oi.order_id,
            SUM(oi.quantity)::int AS total_items
          FROM order_items oi
          WHERE oi.deleted_at IS NULL
          GROUP BY oi.order_id
        ) AS item_summary ON item_summary.order_id = o.id
        ${where}
        GROUP BY DATE_TRUNC('month', o.created_at)
        ${orderBy}
        OFFSET ${pagination.skip}
        LIMIT ${pagination.take}
      `),
      prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT DATE_TRUNC('month', o.created_at) AS month_date
          FROM orders o
          ${where}
          GROUP BY DATE_TRUNC('month', o.created_at)
        ) AS monthly_sales
      `)
    ]);

    return {
      rows,
      total: countRows[0]?.total ?? 0
    };
  },

  async getSalesByCategory(
    query: SalesCategoryReportQuery,
    pagination: Pagination
  ) {
    const filters: Prisma.Sql[] = [
      Prisma.sql`o.deleted_at IS NULL`,
      Prisma.sql`oi.deleted_at IS NULL`,
      Prisma.sql`p.deleted_at IS NULL`,
      Prisma.sql`c.deleted_at IS NULL`,
      Prisma.sql`o.status IN (${Prisma.join(
        SALES_STATUSES.map((status) => Prisma.sql`${status}`)
      )})`
    ];

    if (query.store_id !== undefined) {
      filters.push(Prisma.sql`o.store_id = ${query.store_id}`);
    }

    if (query.category_id !== undefined) {
      filters.push(Prisma.sql`c.id = ${query.category_id}`);
    }

    if (query.search) {
      filters.push(Prisma.sql`c.name ILIKE ${`%${query.search}%`}`);
    }

    filters.push(...buildDateFilters('o.created_at', query.from, query.to));

    const where = whereClause(filters);
    const orderBy = buildOrderBy(query.sort_by ?? 'total_sales', query.sort ?? 'desc', {
      category_name: 'category_name',
      total_sales: 'total_sales',
      total_quantity: 'total_quantity',
      total_orders: 'total_orders'
    });

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          category_id: string;
          category_name: string;
          total_sales: number;
          total_quantity: number;
          total_orders: number;
        }>
      >(Prisma.sql`
        SELECT
          c.id AS category_id,
          c.name AS category_name,
          COALESCE(SUM(oi.total_price), 0)::float8 AS total_sales,
          COALESCE(SUM(oi.quantity), 0)::int AS total_quantity,
          COUNT(DISTINCT o.id)::int AS total_orders
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        INNER JOIN products p ON p.id = oi.product_id
        INNER JOIN product_categories c ON c.id = p.category_id
        ${where}
        GROUP BY c.id, c.name
        ${orderBy}
        OFFSET ${pagination.skip}
        LIMIT ${pagination.take}
      `),
      prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT c.id
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          INNER JOIN products p ON p.id = oi.product_id
          INNER JOIN product_categories c ON c.id = p.category_id
          ${where}
          GROUP BY c.id
        ) AS category_sales
      `)
    ]);

    return {
      rows,
      total: countRows[0]?.total ?? 0
    };
  },

  async getSalesByProduct(
    query: SalesProductReportQuery,
    pagination: Pagination
  ) {
    const filters: Prisma.Sql[] = [
      Prisma.sql`o.deleted_at IS NULL`,
      Prisma.sql`oi.deleted_at IS NULL`,
      Prisma.sql`p.deleted_at IS NULL`,
      Prisma.sql`c.deleted_at IS NULL`,
      Prisma.sql`o.status IN (${Prisma.join(
        SALES_STATUSES.map((status) => Prisma.sql`${status}`)
      )})`
    ];

    if (query.store_id !== undefined) {
      filters.push(Prisma.sql`o.store_id = ${query.store_id}`);
    }

    if (query.category_id !== undefined) {
      filters.push(Prisma.sql`c.id = ${query.category_id}`);
    }

    if (query.product_id !== undefined) {
      filters.push(Prisma.sql`p.id = ${query.product_id}`);
    }

    if (query.search) {
      filters.push(
        Prisma.sql`(p.name ILIKE ${`%${query.search}%`} OR c.name ILIKE ${`%${query.search}%`})`
      );
    }

    filters.push(...buildDateFilters('o.created_at', query.from, query.to));

    const where = whereClause(filters);
    const orderBy = buildOrderBy(query.sort_by ?? 'total_sales', query.sort ?? 'desc', {
      product_name: 'product_name',
      category_name: 'category_name',
      total_sales: 'total_sales',
      total_quantity: 'total_quantity',
      total_orders: 'total_orders'
    });

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          product_id: string;
          product_name: string;
          product_slug: string;
          category_id: string;
          category_name: string;
          total_sales: number;
          total_quantity: number;
          total_orders: number;
        }>
      >(Prisma.sql`
        SELECT
          p.id AS product_id,
          p.name AS product_name,
          p.slug AS product_slug,
          c.id AS category_id,
          c.name AS category_name,
          COALESCE(SUM(oi.total_price), 0)::float8 AS total_sales,
          COALESCE(SUM(oi.quantity), 0)::int AS total_quantity,
          COUNT(DISTINCT o.id)::int AS total_orders
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        INNER JOIN products p ON p.id = oi.product_id
        INNER JOIN product_categories c ON c.id = p.category_id
        ${where}
        GROUP BY p.id, p.name, p.slug, c.id, c.name
        ${orderBy}
        OFFSET ${pagination.skip}
        LIMIT ${pagination.take}
      `),
      prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT p.id
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          INNER JOIN products p ON p.id = oi.product_id
          INNER JOIN product_categories c ON c.id = p.category_id
          ${where}
          GROUP BY p.id
        ) AS product_sales
      `)
    ]);

    return {
      rows,
      total: countRows[0]?.total ?? 0
    };
  },

  async getStockMonthlySummary(
    query: StockMonthlyReportQuery,
    pagination: Pagination
  ) {
    const filters: Prisma.Sql[] = [
      Prisma.sql`sj.deleted_at IS NULL`,
      Prisma.sql`si.deleted_at IS NULL`,
      Prisma.sql`p.deleted_at IS NULL`
    ];

    if (query.store_id !== undefined) {
      filters.push(Prisma.sql`si.store_id = ${query.store_id}`);
    }

    if (query.product_id !== undefined) {
      filters.push(Prisma.sql`si.product_id = ${query.product_id}`);
    }

    if (query.type) {
      filters.push(Prisma.sql`sj.type = ${query.type}::stock_journal_type`);
    }

    filters.push(...buildDateFilters('sj.created_at', query.from, query.to));

    const where = whereClause(filters);
    const stockInList = Prisma.join(STOCK_IN_TYPES.map((type) => Prisma.sql`${type}`));
    const stockOutList = Prisma.join(STOCK_OUT_TYPES.map((type) => Prisma.sql`${type}`));
    const orderBy = buildOrderBy(query.sort_by ?? 'month', query.sort ?? 'desc', {
      month: 'month',
      total_in: 'total_in',
      total_out: 'total_out',
      net_change: 'net_change',
      total_entries: 'total_entries'
    });

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          month: string;
          total_in: number;
          total_out: number;
          net_change: number;
          total_entries: number;
        }>
      >(Prisma.sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', sj.created_at), 'YYYY-MM') AS month,
          COALESCE(SUM(CASE WHEN sj.type IN (${stockInList}) THEN sj.quantity ELSE 0 END), 0)::int AS total_in,
          COALESCE(SUM(CASE WHEN sj.type IN (${stockOutList}) THEN sj.quantity ELSE 0 END), 0)::int AS total_out,
          COALESCE(SUM(CASE
            WHEN sj.type IN (${stockInList}) THEN sj.quantity
            WHEN sj.type IN (${stockOutList}) THEN -sj.quantity
            ELSE 0
          END), 0)::int AS net_change,
          COUNT(sj.id)::int AS total_entries
        FROM stock_journals sj
        INNER JOIN store_inventories si ON si.id = sj.store_inventory_id
        INNER JOIN products p ON p.id = si.product_id
        ${where}
        GROUP BY DATE_TRUNC('month', sj.created_at)
        ${orderBy}
        OFFSET ${pagination.skip}
        LIMIT ${pagination.take}
      `),
      prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT DATE_TRUNC('month', sj.created_at) AS month_date
          FROM stock_journals sj
          INNER JOIN store_inventories si ON si.id = sj.store_inventory_id
          INNER JOIN products p ON p.id = si.product_id
          ${where}
          GROUP BY DATE_TRUNC('month', sj.created_at)
        ) AS monthly_stock
      `)
    ]);

    return {
      rows,
      total: countRows[0]?.total ?? 0
    };
  },

  async getStockHistory(
    query: StockHistoryReportQuery,
    pagination: Pagination
  ) {
    const filters: Prisma.Sql[] = [
      Prisma.sql`sj.deleted_at IS NULL`,
      Prisma.sql`si.deleted_at IS NULL`,
      Prisma.sql`p.deleted_at IS NULL`,
      Prisma.sql`c.deleted_at IS NULL`,
      Prisma.sql`s.deleted_at IS NULL`
    ];

    if (query.store_id !== undefined) {
      filters.push(Prisma.sql`si.store_id = ${query.store_id}`);
    }

    if (query.product_id !== undefined) {
      filters.push(Prisma.sql`si.product_id = ${query.product_id}`);
    }

    if (query.category_id !== undefined) {
      filters.push(Prisma.sql`c.id = ${query.category_id}`);
    }

    if (query.type) {
      filters.push(Prisma.sql`sj.type = ${query.type}::stock_journal_type`);
    }

    if (query.search) {
      filters.push(
        Prisma.sql`(
          p.name ILIKE ${`%${query.search}%`}
          OR c.name ILIKE ${`%${query.search}%`}
          OR COALESCE(sj.description, '') ILIKE ${`%${query.search}%`}
        )`
      );
    }

    filters.push(...buildDateFilters('sj.created_at', query.from, query.to));

    const where = whereClause(filters);
    const orderBy = buildOrderBy(query.sort_by ?? 'created_at', query.sort ?? 'desc', {
      created_at: 'created_at',
      quantity: 'quantity',
      type: 'type',
      product_name: 'product_name',
      category_name: 'category_name'
    });

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          id: string;
          created_at: Date;
          type: stock_journal_type;
          quantity: number;
          description: string | null;
          reference_id: string | null;
          store_id: string;
          store_name: string;
          product_id: string;
          product_name: string;
          product_slug: string;
          category_id: string;
          category_name: string;
        }>
      >(Prisma.sql`
        SELECT
          sj.id,
          sj.created_at,
          sj.type,
          sj.quantity,
          sj.description,
          sj.reference_id,
          s.id AS store_id,
          s.name AS store_name,
          p.id AS product_id,
          p.name AS product_name,
          p.slug AS product_slug,
          c.id AS category_id,
          c.name AS category_name
        FROM stock_journals sj
        INNER JOIN store_inventories si ON si.id = sj.store_inventory_id
        INNER JOIN stores s ON s.id = si.store_id
        INNER JOIN products p ON p.id = si.product_id
        INNER JOIN product_categories c ON c.id = p.category_id
        ${where}
        ${orderBy}
        OFFSET ${pagination.skip}
        LIMIT ${pagination.take}
      `),
      prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS total
        FROM stock_journals sj
        INNER JOIN store_inventories si ON si.id = sj.store_inventory_id
        INNER JOIN stores s ON s.id = si.store_id
        INNER JOIN products p ON p.id = si.product_id
        INNER JOIN product_categories c ON c.id = p.category_id
        ${where}
      `)
    ]);

    return {
      rows,
      total: countRows[0]?.total ?? 0
    };
  }
};
