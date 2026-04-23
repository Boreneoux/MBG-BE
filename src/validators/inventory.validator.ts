import { z } from 'zod';

const JOURNAL_TYPES = [
    'addition',
    'reduction',
    'mutation_in',
    'mutation_out',
    'order_deduction',
    'order_cancellation_return',
] as const;

export const adjustStockSchema = z.object({
    body: z.object({
        store_id: z.number().int().positive('store_id must be a positive integer').optional(),
        product_id: z.number().int().positive('product_id must be a positive integer'),
        quantity: z.number().int().positive('quantity must be a positive integer'),
        type: z.enum(['addition', 'reduction'], {
            error: 'type must be either addition or reduction',
        }),
        description: z.string().trim().max(500).optional(),
    }),
});

export const createJournalSchema = z.object({
    body: z.object({
        store_id: z.number().int().positive('store_id must be a positive integer').optional(),
        product_id: z.number().int().positive('product_id must be a positive integer'),
        quantity: z.number().int().positive('quantity must be a positive integer'),
        type: z.enum(JOURNAL_TYPES, {
            error: 'type must be a valid journal type',
        }),
        description: z.string().trim().max(500).optional(),
    }),
});

export const journalQuerySchema = z.object({
    query: z.object({
        store_id: z.coerce.number().int().positive().optional(),
        product_id: z.coerce.number().int().positive().optional(),
        type: z.enum(JOURNAL_TYPES).optional(),
        from: z
            .string()
            .refine((v) => !isNaN(Date.parse(v)), 'from must be a valid ISO date')
            .optional(),
        to: z
            .string()
            .refine((v) => !isNaN(Date.parse(v)), 'to must be a valid ISO date')
            .optional(),
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(10),
        sort: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const inventoryQuerySchema = z.object({
    query: z.object({
        store_id: z.coerce.number().int().positive().optional(),
        product_id: z.coerce.number().int().positive().optional(),
    }),
});

export const createInventorySchema = z.object({
    body: z.object({
        store_id: z.number().int().positive('store_id must be a positive integer').optional(),
        product_id: z.number().int().positive('product_id must be a positive integer'),
        initial_stock: z
            .number()
            .int('initial_stock must be an integer')
            .min(0, 'initial_stock must be >= 0'),
        description: z.string().trim().max(500).optional(),
    }),
});

export const inventoryIdParamSchema = z.object({
    params: z.object({
        id: z.coerce.number().int().positive('Inventory ID must be a positive integer'),
    }),
});
