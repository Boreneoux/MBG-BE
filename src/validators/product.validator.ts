import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Product name is required').max(255),
    description: z.string().optional(),
    price: z.preprocess(val => Number(val), z.number().min(0)),
    weight: z.preprocess(val => Number(val), z.number().min(0)),
    category_id: z.string().uuid('category_id must be a valid UUID')
  })
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Product name is required').max(255).optional(),
    description: z.string().optional(),
    price: z.preprocess(val => Number(val), z.number().min(0)).optional(),
    weight: z.preprocess(val => Number(val), z.number().min(0)).optional(),
    category_id: z.string().uuid('category_id must be a valid UUID').optional(),
    primaryIndex: z
      .preprocess(val => Number(val), z.number().int().min(0))
      .optional(),
    deleteImageIds: z.union([z.array(z.string()), z.string()]).optional()
  })
});

export const getProductsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    search: z.string().optional(),
    category: z.string().optional(),
    sort: z.enum(['price_asc', 'price_desc', 'newest']).optional()
  })
});
