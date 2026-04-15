import { z } from 'zod';

export const addToCartSchema = z.object({
  body: z.object({
    product_id: z
      .number({ error: 'Product ID is required' })
      .int()
      .positive('Product ID must be a positive integer'),
    quantity: z
      .number()
      .int()
      .positive('Quantity must be at least 1')
      .default(1),
    store_id: z
      .number({ error: 'Store ID is required' })
      .int()
      .positive('Store ID must be a positive integer')
  })
});

export const updateCartItemSchema = z.object({
  params: z.object({
    id: z.coerce
      .number({ error: 'Cart item ID is required' })
      .int()
      .positive('Cart item ID must be a positive integer')
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
    id: z.coerce
      .number({ error: 'Cart item ID is required' })
      .int()
      .positive('Cart item ID must be a positive integer')
  })
});
