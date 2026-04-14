import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    address_id: z
      .number({ error: 'address_id is required' })
      .int()
      .positive('address_id must be a positive integer'),

    payment_method: z.enum(['manual_transfer', 'payment_gateway'], {
      error: 'payment_method must be manual_transfer or payment_gateway'
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
      .number()
      .min(0)
      .optional()
  })
});
