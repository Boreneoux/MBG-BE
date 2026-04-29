import { z } from 'zod';

export const createMutationSchema = z.object({
    body: z.object({
        source_store_id: z.string().uuid('source_store_id must be a valid UUID'),
        destination_store_id: z.string().uuid('destination_store_id must be a valid UUID'),
        product_id: z.string().uuid('product_id must be a valid UUID'),
        quantity: z.number().int().positive('quantity must be a positive integer'),
    }),
});

export const getMutationsQuerySchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
        sort: z.enum(['asc', 'desc']).optional()
    })
});
