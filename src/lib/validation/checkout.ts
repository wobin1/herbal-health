import { z } from 'zod';

/**
 * Checkout is buyer-only: the buyer's own details back every ticket in the
 * order (Registration/Attendee rows still exist one-per-ticket for check-in,
 * populated from these fields — see order-service). Deliberately excludes
 * anything health/medical-related — CLAUDE.md forbids collecting PHI on this
 * platform.
 */
export const checkoutRequestSchema = z.object({
  eventId: z.string().trim().min(1).max(200),
  ticketTypeId: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(10),
  buyerEmail: z.string().trim().email().max(320),
  buyerName: z.string().trim().min(1).max(400),
  buyerPhone: z.string().trim().min(3).max(50),
  buyerCountry: z.string().trim().min(2).max(100),
  termsVersion: z.string().trim().min(1).max(50),
});

export type CheckoutRequestInput = z.infer<typeof checkoutRequestSchema>;

export const registrationLookupSchema = z.object({
  reference: z.string().trim().min(1).max(50),
  email: z.string().trim().email().max(320),
});

export const mockCheckoutPaySchema = z.object({
  sessionId: z.string().trim().min(1).max(200),
});
