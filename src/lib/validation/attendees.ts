import { z } from 'zod';

/**
 * Deliberately excludes anything health/medical-related — CLAUDE.md forbids
 * collecting PHI on this platform. Mirrors src/lib/validation/checkout.ts's
 * attendee shape for consistency.
 */
export const transferAttendeeSchema = z.object({
  firstName: z.string().trim().min(1).max(200),
  lastName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(3).max(50),
  country: z.string().trim().min(2).max(100),
  organization: z.string().trim().max(200).optional().nullable(),
  accessibilityNotes: z.string().trim().max(1000).optional().nullable(),
});

export type TransferAttendeeInput = z.infer<typeof transferAttendeeSchema>;

export const attendeeNoteSchema = z.object({
  note: z.string().trim().max(2000),
});
