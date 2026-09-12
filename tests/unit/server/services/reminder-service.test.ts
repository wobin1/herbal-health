import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  registration: { findMany: vi.fn() },
};
vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));

const enqueueEmailMock = vi.fn();
vi.mock('@/server/services/email-queue-service', () => ({ enqueueEmail: enqueueEmailMock }));

const { sendEventReminders } = await import('@/server/services/reminder-service');

const REGISTRATION = {
  id: 'reg-1',
  reference: 'HHS-2026-ABCDEF',
  attendee: { firstName: 'Jane', email: 'jane@example.com' },
  event: { title: 'Herbal Basics', startAt: new Date('2026-06-08T00:00:00Z'), city: 'Austin', state: 'TX' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sendEventReminders', () => {
  it('queries both the 7-day and 1-day windows', async () => {
    prismaMock.registration.findMany.mockResolvedValue([]);
    const now = new Date('2026-06-01T00:00:00Z');

    await sendEventReminders(now);

    expect(prismaMock.registration.findMany).toHaveBeenCalledTimes(2);
    const [sevenDayCall, oneDayCall] = prismaMock.registration.findMany.mock.calls;
    expect(sevenDayCall[0].where.event.startAt.gte).toEqual(new Date('2026-06-08T00:00:00Z'));
    expect(oneDayCall[0].where.event.startAt.gte).toEqual(new Date('2026-06-02T00:00:00Z'));
  });

  it('enqueues a reminder with a dedupeKey unique to the offset and registration', async () => {
    prismaMock.registration.findMany.mockResolvedValueOnce([REGISTRATION]).mockResolvedValueOnce([]);
    const now = new Date('2026-06-01T00:00:00Z');

    const result = await sendEventReminders(now);

    expect(enqueueEmailMock).toHaveBeenCalledWith(
      prismaMock,
      expect.objectContaining({
        type: 'EVENT_REMINDER',
        toEmail: 'jane@example.com',
        dedupeKey: 'reminder-7d:reg-1',
      }),
    );
    expect(result.enqueued).toBe(1);
  });

  it('is idempotent: enqueueEmail silently no-ops on a re-run via the unique dedupeKey', async () => {
    prismaMock.registration.findMany.mockResolvedValue([REGISTRATION]);
    enqueueEmailMock.mockResolvedValue(undefined);

    await sendEventReminders(new Date('2026-06-01T00:00:00Z'));
    await sendEventReminders(new Date('2026-06-01T00:00:00Z'));

    const dedupeKeys = enqueueEmailMock.mock.calls.map((call) => call[1].dedupeKey);
    expect(dedupeKeys.filter((k) => k === 'reminder-7d:reg-1')).toHaveLength(2);
    expect(enqueueEmailMock).toHaveBeenCalledTimes(4);
  });
});
