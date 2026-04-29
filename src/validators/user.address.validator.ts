import { z } from 'zod';

const coordinateLatitude = z.number().min(-90).max(90);

const coordinateLongitude = z.number().min(-180).max(180);

export const createAddressSchema = z.object({
  body: z.object({
    label: z.string().trim().max(50).optional(),
    recipient_name: z.string().trim().min(1, 'Recipient name is required').max(100),
    phone: z.string().trim().min(1, 'Phone is required').max(20),
    address: z.string().trim().min(1, 'Address is required'),
    district_id: z.string().uuid('district_id must be a valid UUID'),
    city_id: z.string().uuid('city_id must be a valid UUID'),
    province_id: z.string().uuid('province_id must be a valid UUID'),
    postal_code: z.string().trim().max(10).optional(),
    latitude: coordinateLatitude,
    longitude: coordinateLongitude,
    is_primary: z.boolean().optional()
  })
});

export const updateAddressSchema = z.object({
  params: z.object({
    id: z.string().uuid('Address ID must be a valid UUID')
  }),
  body: z
    .object({
      label: z.string().trim().max(50).optional(),
      recipient_name: z.string().trim().min(1).max(100).optional(),
      phone: z.string().trim().min(1).max(20).optional(),
      address: z.string().trim().min(1).optional(),
      district_id: z.string().uuid('district_id must be a valid UUID').optional(),
      city_id: z.string().uuid('city_id must be a valid UUID').optional(),
      province_id: z.string().uuid('province_id must be a valid UUID').optional(),
      postal_code: z.string().trim().max(10).optional(),
      latitude: coordinateLatitude.optional(),
      longitude: coordinateLongitude.optional(),
      is_primary: z.boolean().optional()
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field must be provided for update'
    })
});

export const addressParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Address ID must be a valid UUID')
  })
});
