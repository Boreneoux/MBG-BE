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

const storeIdParam = z.object({
  id: z.coerce.number().int().positive('Store ID must be a positive integer')
});

const storeBodyFields = {
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  address: z.string().trim().min(1, 'Address is required'),
  district_id: z.number().int().positive('district_id must be a positive integer'),
  city_id: z.number().int().positive('city_id must be a positive integer'),
  province_id: z.number().int().positive('province_id must be a positive integer'),
  postal_code: z.string().trim().optional(),
  latitude: z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  longitude: z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
  max_delivery_distance: z.number().positive('max_delivery_distance must be a positive number')
};

export const createStoreSchema = z.object({
  body: z.object(storeBodyFields)
});

export const updateStoreSchema = z.object({
  params: storeIdParam,
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
  params: storeIdParam
});

export const assignAdminSchema = z.object({
  params: storeIdParam,
  body: z.object({
    user_id: z.number().int().positive('user_id must be a positive integer')
  })
});
