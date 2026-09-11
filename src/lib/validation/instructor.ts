import { z } from 'zod';

export const instructorSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase, alphanumeric, hyphen-separated'),
  name: z.string().trim().min(1).max(300),
  credentials: z.string().trim().max(300).optional().nullable(),
  shortBio: z.string().trim().min(1).max(1000),
  fullBio: z.string().trim().min(1).max(20000),
  photoUrl: z.string().trim().url().max(2000).optional().nullable(),
  websiteUrl: z.string().trim().url().max(2000).optional().nullable(),
  socialLinks: z.record(z.string(), z.string().url()).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  published: z.boolean().optional(),
});

export const instructorUpdateSchema = instructorSchema.partial();

export type InstructorInput = z.infer<typeof instructorSchema>;
