import { z } from 'zod';

export const calculateShippingSchema = z.object({
  body: z.object({
    store_id: z.string().uuid('store_id must be a valid UUID'),
    address_id: z.string().uuid('address_id must be a valid UUID'),
    weight: z.coerce.number().int().min(1, 'weight must be at least 1 gram'),
    courier: z.enum(['jne', 'tiki', 'pos'], {
      error: 'courier must be one of: jne, tiki, pos'
    })
  })
});
