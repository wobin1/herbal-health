import type { EventStatus } from '@prisma/client';

export interface EventStatusCta {
  /** CTA button label, or null when the event must not be shown publicly at all. */
  label: string | null;
  /** Whether an event in this status may appear on public listing/detail pages. */
  isPubliclyVisible: boolean;
  /** Whether the CTA is an actionable button vs. a disabled/informational label. */
  ctaEnabled: boolean;
}

const STATUS_CTA: Record<EventStatus, EventStatusCta> = {
  DRAFT: { label: null, isPubliclyVisible: false, ctaEnabled: false },
  COMING_SOON: { label: 'View Details', isPubliclyVisible: true, ctaEnabled: true },
  PUBLISHED: { label: 'Details', isPubliclyVisible: true, ctaEnabled: true },
  ON_SALE: { label: 'Buy Tickets', isPubliclyVisible: true, ctaEnabled: true },
  SOLD_OUT: { label: 'Join Waitlist', isPubliclyVisible: true, ctaEnabled: true },
  CLOSED: { label: 'Event Closed', isPubliclyVisible: true, ctaEnabled: false },
  CANCELLED: { label: 'Cancelled', isPubliclyVisible: true, ctaEnabled: false },
  COMPLETED: { label: 'View Recap', isPubliclyVisible: true, ctaEnabled: true },
};

export function getEventStatusCta(status: EventStatus): EventStatusCta {
  return STATUS_CTA[status];
}
