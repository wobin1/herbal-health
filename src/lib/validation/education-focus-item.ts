import { z } from 'zod';

export const educationFocusItemSchema = z.object({
  icon: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  imageUrl: z.string().trim().url().max(2000).optional().nullable(),
  sortOrder: z.number().int().optional(),
  published: z.boolean().optional(),
});

export const educationFocusItemUpdateSchema = educationFocusItemSchema.partial();

export type EducationFocusItemInput = z.infer<typeof educationFocusItemSchema>;
