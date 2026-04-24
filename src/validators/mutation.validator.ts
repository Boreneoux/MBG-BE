import { z } from 'zod';

export const createMutationSchema = z.object({
    body: z.object({
        source_store_id: z.number().int().positive('source_store_id must be a positive integer'),
        destination_store_id: z.number().int().positive('destination_store_id must be a positive integer'),
        product_id: z.number().int().positive('product_id must be a positive integer'),
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
