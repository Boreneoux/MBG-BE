import { z } from 'zod';

export const createCategorySchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Category name is required').max(100)
    })
});

export const updateCategorySchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Category name is required').max(100)
    })
});

export const getCategoriesQuerySchema = z.object({
    query: z.object({
        search: z.string().optional()
    })
});
