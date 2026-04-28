import { z } from 'zod';
import { order_status } from '../../generated/prisma/client';

export const createOrderSchema = z.object({
  body: z.object({
    address_id: z.string().uuid('address_id must be a valid UUID'),

    payment_method: z.literal('payment_gateway', {
      error: 'payment_method must be payment_gateway'
    }),

    voucher_code: z
      .string()
      .trim()
      .min(1)
      .optional(),

    shipping_method: z
      .string()
      .trim()
      .min(1)
      .optional(),

    shipping_cost: z
      .number({ error: 'shipping_cost must be a number' })
      .int('shipping_cost must be an integer (in IDR cents / smallest unit)')
      .min(1, 'shipping_cost must be at least 1')
      .optional()
  })
});

export const getAdminOrdersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.enum(['asc', 'desc']).optional(),
    warehouse_id: z.string().uuid().optional(),
    order_number: z.string().trim().min(1).optional(),
    status: z.nativeEnum(order_status).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional()
  })
});

export const orderIdParamsSchema = z.object({
  params: z.object({
    orderNumber: z.string().min(1, 'Order number is required')
  })
});
