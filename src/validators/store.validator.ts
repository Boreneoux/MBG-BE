import { z } from 'zod';

const optionalFloat = (min: number, max: number, label: string) =>
  z
    .coerce
    .number({ error: `${label} must be a number` })
    .min(min, `${label} must be >= ${min}`)
    .max(max, `${label} must be <= ${max}`)
    .optional();

export const nearestStoreQuerySchema = z.object({
  query: z
    .object({
      lat: optionalFloat(-90, 90, 'lat'),
      lng: optionalFloat(-180, 180, 'lng'),
      page: z.coerce.number().int().positive().optional().default(1),
      limit: z.coerce.number().int().positive().max(100).optional().default(10),
      search: z.string().trim().optional(),
    })
    .refine(
      (q) => (q.lat === undefined) === (q.lng === undefined),
      { message: 'Provide both lat and lng, or neither' }
    )
});

const storeSlugParam = z.object({
  slug: z.string().min(1, 'Store slug is required')
});

const storeBodyFields = {
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  address: z.string().trim().min(1, 'Address is required'),
  district_id: z.string().uuid('district_id must be a valid UUID'),
  city_id: z.string().uuid('city_id must be a valid UUID'),
  province_id: z.string().uuid('province_id must be a valid UUID'),
  postal_code: z.string().trim().optional(),
  latitude: z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  longitude: z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
  max_delivery_distance: z.number().positive('max_delivery_distance must be a positive number')
};

export const createStoreSchema = z.object({
  body: z.object(storeBodyFields)
});

export const updateStoreSchema = z.object({
  params: storeSlugParam,
  body: z
    .object({
      name: storeBodyFields.name.optional(),
      address: storeBodyFields.address.optional(),
      district_id: storeBodyFields.district_id.optional(),
      city_id: storeBodyFields.city_id.optional(),
      province_id: storeBodyFields.province_id.optional(),
      postal_code: storeBodyFields.postal_code,
      latitude: storeBodyFields.latitude.optional(),
      longitude: storeBodyFields.longitude.optional(),
      max_delivery_distance: storeBodyFields.max_delivery_distance.optional()
    })
    .refine(
      (data) => Object.values(data).some((v) => v !== undefined),
      { message: 'At least one field must be provided for update' }
    )
});

export const storeParamsSchema = z.object({
  params: storeSlugParam
});

export const assignAdminSchema = z.object({
  params: storeSlugParam,
  body: z.object({
    user_id: z.string().uuid('user_id must be a valid UUID')
  })
});

export const unassignAdminSchema = z.object({
  params: z.object({
    slug: z.string().min(1, 'Store slug is required'),
    userId: z.string().uuid('User ID must be a valid UUID')
  })
});
