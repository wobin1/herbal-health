import { z } from 'zod';

const isoDate = z.coerce.date();

export const eventCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase, alphanumeric, hyphen-separated'),
  title: z.string().trim().min(1).max(300),
  seriesName: z.string().trim().max(200).optional().nullable(),
  volumeLabel: z.string().trim().max(100).optional().nullable(),
  internalCode: z.string().trim().max(100).optional().nullable(),
  shortDescription: z.string().trim().min(1).max(500),
  longDescription: z.string().trim().max(20000).optional().nullable(),
  startAt: isoDate,
  endAt: isoDate.optional().nullable(),
  timezone: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(200),
  state: z.string().trim().min(1).max(200),
  locationId: z.string().trim().min(1).max(200).optional().nullable(),
  coverImageUrl: z.string().trim().url().max(2000).optional().nullable(),
  galleryImageUrls: z.array(z.string().trim().url().max(2000)).optional(),
  documentUrls: z.array(z.string().trim().url().max(2000)).optional(),
  whatYouWillLearn: z.array(z.string().trim().min(1).max(500)).optional(),
  materialsIncluded: z.array(z.string().trim().min(1).max(500)).optional(),
  prerequisites: z.string().trim().max(2000).optional().nullable(),
  disclaimer: z.string().trim().max(2000).optional().nullable(),
  seoTitle: z.string().trim().max(200).optional().nullable(),
  seoMetaDescription: z.string().trim().max(500).optional().nullable(),
  seoCanonicalUrl: z.string().trim().url().max(2000).optional().nullable(),
  seoOgImageUrl: z.string().trim().url().max(2000).optional().nullable(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const eventUpdateSchema = eventCreateSchema.partial();

export const eventTicketTypeSchema = z.object({
  name: z.string().trim().min(1).max(200),
  priceMinorUnits: z.number().int().min(0),
  currency: z.string().trim().length(3).default('USD'),
  capacity: z.number().int().min(0),
  salesStartAt: isoDate.optional().nullable(),
  salesEndAt: isoDate.optional().nullable(),
  refundPolicy: z.string().trim().max(2000).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const eventFaqOverrideSchema = z.object({
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(5000),
  sortOrder: z.number().int().optional(),
});

export const eventInstructorLinkSchema = z.object({
  instructorId: z.string().trim().min(1).max(200),
  sortOrder: z.number().int().optional(),
});

export const publicEventFiltersSchema = z.object({
  keyword: z.string().trim().max(200).optional(),
  city: z.string().trim().max(200).optional(),
  state: z.string().trim().max(200).optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
});

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
