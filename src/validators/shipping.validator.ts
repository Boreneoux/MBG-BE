import { z } from 'zod';

export const calculateShippingSchema = z.object({
  body: z.object({
    store_id: z.coerce.number().int().positive('store_id must be a positive integer'),
    address_id: z.coerce.number().int().positive('address_id must be a positive integer'),
    weight: z.coerce.number().int().min(1, 'weight must be at least 1 gram'),
    courier: z.enum(['jne', 'tiki', 'pos'], {
      error: 'courier must be one of: jne, tiki, pos'
    })
  })
});
