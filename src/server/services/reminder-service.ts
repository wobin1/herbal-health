import { prisma } from '@/lib/db/client';
import { enqueueEmail } from '@/server/services/email-queue-service';

/** MVP reminder offsets per spec §28. Each offset gets its own dedupeKey namespace. */
const REMINDER_OFFSETS = [
  { label: '7d', days: 7, windowHours: 24 },
  { label: '1d', days: 1, windowHours: 24 },
] as const;

export interface SendEventRemindersResult {
  enqueued: number;
}

/**
 * Enqueues a reminder email for every CONFIRMED registration whose event
 * starts within the offset's day-window. Idempotent: dedupeKey is
 * `reminder-{offset}:{registrationId}`, unique per EmailMessage, so running
 * this job again for the same window never re-sends.
 */
export async function sendEventReminders(now: Date = new Date()): Promise<SendEventRemindersResult> {
  let enqueued = 0;

  for (const offset of REMINDER_OFFSETS) {
    const windowStart = new Date(now.getTime() + offset.days * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(windowStart.getTime() + offset.windowHours * 60 * 60 * 1000);

    const registrations = await prisma.registration.findMany({
      where: {
        status: 'CONFIRMED',
        event: { startAt: { gte: windowStart, lt: windowEnd } },
      },
      include: { attendee: true, event: true },
    });

    for (const registration of registrations) {
      await enqueueEmail(prisma, {
        type: 'EVENT_REMINDER',
        toEmail: registration.attendee.email,
        dedupeKey: `reminder-${offset.label}:${registration.id}`,
        variables: {
          attendeeFirstName: registration.attendee.firstName,
          registrationReference: registration.reference,
          reminderLabel: offset.label === '7d' ? 'in 7 days' : 'tomorrow',
          eventTitle: registration.event.title,
          eventStartAt: registration.event.startAt.toISOString(),
          eventLocation: `${registration.event.city}, ${registration.event.state}`,
        },
      });
      enqueued += 1;
    }
  }

  return { enqueued };
}
