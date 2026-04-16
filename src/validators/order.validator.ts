import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    address_id: z
      .number({ error: 'address_id is required' })
      .int()
      .positive('address_id must be a positive integer'),

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

export const orderIdParamsSchema = z.object({
  params: z.object({
    id: z.coerce
      .number({ error: 'Order ID is required' })
      .int()
      .positive('Order ID must be a positive integer')
  })
});
