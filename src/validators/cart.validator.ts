import { z } from 'zod';

export const addToCartSchema = z.object({
  body: z.object({
    product_id: z.string().uuid('Product ID must be a valid UUID'),
    quantity: z
      .number()
      .int()
      .positive('Quantity must be at least 1')
      .default(1),
    store_id: z.string().uuid('Store ID must be a valid UUID')
  })
});

export const updateCartItemSchema = z.object({
  params: z.object({
    id: z.string().uuid('Cart item ID must be a valid UUID')
  }),
  body: z.object({
    quantity: z
      .number({ error: 'Quantity is required' })
      .int()
      .positive('Quantity must be at least 1')
  })
});

export const deleteCartItemSchema = z.object({
  params: z.object({
    id: z.string().uuid('Cart item ID must be a valid UUID')
  })
});
