import { z } from 'zod';

/**
 * Attendee details we collect. Deliberately excludes anything
 * health/medical-related — CLAUDE.md forbids collecting PHI on this
 * platform. `accessibilityNotes` is a free-text accommodation request, not a
 * diagnosis field.
 */
export const attendeeSchema = z.object({
  firstName: z.string().trim().min(1).max(200),
  lastName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(3).max(50),
  country: z.string().trim().min(2).max(100),
  organization: z.string().trim().max(200).optional().nullable(),
  accessibilityNotes: z.string().trim().max(1000).optional().nullable(),
});

export const checkoutRequestSchema = z
  .object({
    eventId: z.string().trim().min(1).max(200),
    ticketTypeId: z.string().trim().min(1).max(200),
    quantity: z.number().int().min(1).max(10),
    attendees: z.array(attendeeSchema).min(1).max(10),
    buyerEmail: z.string().trim().email().max(320),
    buyerName: z.string().trim().min(1).max(400),
    termsVersion: z.string().trim().min(1).max(50),
  })
  .refine((data) => data.attendees.length === data.quantity, {
    message: 'attendees must match quantity',
    path: ['attendees'],
  });

export type CheckoutRequestInput = z.infer<typeof checkoutRequestSchema>;
export type AttendeeInput = z.infer<typeof attendeeSchema>;

export const registrationLookupSchema = z.object({
  reference: z.string().trim().min(1).max(50),
  email: z.string().trim().email().max(320),
});
