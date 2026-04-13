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
      lng: optionalFloat(-180, 180, 'lng')
    })
    .refine(
      (q) => (q.lat === undefined) === (q.lng === undefined),
      { message: 'Provide both lat and lng, or neither' }
    )
});
