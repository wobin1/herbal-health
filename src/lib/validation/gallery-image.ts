import { z } from 'zod';

export const galleryImageSchema = z.object({
  url: z.string().trim().url().max(2000),
  caption: z.string().trim().max(300).optional().nullable(),
  sortOrder: z.number().int().optional(),
  published: z.boolean().optional(),
});

export const galleryImageUpdateSchema = galleryImageSchema.partial();

export type GalleryImageInput = z.infer<typeof galleryImageSchema>;
