import { z } from 'zod';

const JOURNAL_TYPES = [
  'addition',
  'reduction',
  'mutation_in',
  'mutation_out',
  'order_deduction',
  'order_cancellation_return'
] as const;

const baseQuerySchema = z.object({
  store_id: z.coerce.number().int().positive().optional(),
  from: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'from must be a valid ISO date')
    .optional(),
  to: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'to must be a valid ISO date')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sort: z.enum(['asc', 'desc']).default('desc')
});

export const salesMonthlyReportQuerySchema = z.object({
  query: baseQuerySchema.extend({
    sort_by: z.enum(['month', 'total_sales', 'total_orders', 'total_items']).default('month')
  })
});

export const salesCategoryReportQuerySchema = z.object({
  query: baseQuerySchema.extend({
    category_id: z.coerce.number().int().positive().optional(),
    search: z.string().trim().min(1).max(100).optional(),
    sort_by: z
      .enum(['category_name', 'total_sales', 'total_quantity', 'total_orders'])
      .default('total_sales')
  })
});

export const salesProductReportQuerySchema = z.object({
  query: baseQuerySchema.extend({
    category_id: z.coerce.number().int().positive().optional(),
    product_id: z.coerce.number().int().positive().optional(),
    search: z.string().trim().min(1).max(100).optional(),
    sort_by: z
      .enum([
        'product_name',
        'category_name',
        'total_sales',
        'total_quantity',
        'total_orders'
      ])
      .default('total_sales')
  })
});

export const stockMonthlyReportQuerySchema = z.object({
  query: baseQuerySchema.extend({
    product_id: z.coerce.number().int().positive().optional(),
    type: z.enum(JOURNAL_TYPES).optional(),
    sort_by: z
      .enum(['month', 'total_in', 'total_out', 'net_change', 'total_entries'])
      .default('month')
  })
});

export const stockHistoryReportQuerySchema = z.object({
  query: baseQuerySchema.extend({
    product_id: z.coerce.number().int().positive().optional(),
    category_id: z.coerce.number().int().positive().optional(),
    type: z.enum(JOURNAL_TYPES).optional(),
    search: z.string().trim().min(1).max(100).optional(),
    sort_by: z
      .enum(['created_at', 'quantity', 'type', 'product_name', 'category_name'])
      .default('created_at')
  })
});
