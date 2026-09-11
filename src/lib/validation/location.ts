import { z } from 'zod';

export const locationSchema = z.object({
  name: z.string().trim().min(1).max(300),
  address: z.string().trim().min(1).max(500),
  city: z.string().trim().min(1).max(200),
  state: z.string().trim().min(1).max(200),
  postalCode: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().min(1).max(100).default('US'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  mapUrl: z.string().trim().url().max(2000).optional().nullable(),
});

export const locationUpdateSchema = locationSchema.partial();

export type LocationInput = z.infer<typeof locationSchema>;
