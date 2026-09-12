import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  emailMessage: { create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
};
vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));

const sendMock = vi.fn();
vi.mock('@/lib/email/provider', () => ({ getEmailProvider: () => ({ send: sendMock }) }));

const { enqueueEmail, processPendingEmails } = await import('@/server/services/email-queue-service');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('enqueueEmail', () => {
  it('writes a PENDING outbox row keyed by dedupeKey', async () => {
    const tx = { emailMessage: { create: vi.fn().mockResolvedValue({}) } };
    await enqueueEmail(tx as never, {
      type: 'REGISTRATION_CONFIRMATION',
      toEmail: 'jane@example.com',
      dedupeKey: 'reg-confirm:reg-1',
      variables: { attendeeFirstName: 'Jane', eventTitle: 'Herbs 101', eventStartAt: '', eventLocation: '' },
    });
    expect(tx.emailMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'REGISTRATION_CONFIRMATION',
        toEmail: 'jane@example.com',
        dedupeKey: 'reg-confirm:reg-1',
      }),
    });
  });

  it('silently no-ops on a duplicate dedupeKey instead of throwing', async () => {
    const tx = { emailMessage: { create: vi.fn().mockRejectedValue({ code: 'P2002' }) } };
    await expect(
      enqueueEmail(tx as never, {
        type: 'EVENT_REMINDER',
        toEmail: 'jane@example.com',
        dedupeKey: 'reminder-7d:reg-1',
        variables: { attendeeFirstName: 'Jane', eventTitle: 'Herbs 101', eventStartAt: '', eventLocation: '' },
      }),
    ).resolves.toBeUndefined();
  });

  it('rethrows non-duplicate errors', async () => {
    const tx = { emailMessage: { create: vi.fn().mockRejectedValue(new Error('db down')) } };
    await expect(
      enqueueEmail(tx as never, {
        type: 'EVENT_REMINDER',
        toEmail: 'jane@example.com',
        dedupeKey: 'reminder-7d:reg-1',
        variables: { attendeeFirstName: 'Jane', eventTitle: 'Herbs 101', eventStartAt: '', eventLocation: '' },
      }),
    ).rejects.toThrow('db down');
  });
});

describe('processPendingEmails', () => {
  const baseMessage = {
    id: 'email-1',
    type: 'REGISTRATION_CONFIRMATION',
    toEmail: 'jane@example.com',
    attempts: 0,
    variables: { attendeeFirstName: 'Jane', eventTitle: 'Herbs 101', eventStartAt: 'Jan 1', eventLocation: 'HQ' },
  };

  it('sends a pending email and marks it SENT', async () => {
    prismaMock.emailMessage.findMany.mockResolvedValue([baseMessage]);
    sendMock.mockResolvedValue(undefined);

    const result = await processPendingEmails();

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: 'jane@example.com', subject: expect.any(String) }),
    );
    expect(prismaMock.emailMessage.update).toHaveBeenCalledWith({
      where: { id: 'email-1' },
      data: expect.objectContaining({ status: 'SENT', attempts: 1 }),
    });
    expect(result).toEqual({ sent: 1, failed: 0 });
  });

  it('keeps a failed send PENDING for retry when attempts remain', async () => {
    prismaMock.emailMessage.findMany.mockResolvedValue([baseMessage]);
    sendMock.mockRejectedValue(new Error('provider down'));

    const result = await processPendingEmails();

    expect(prismaMock.emailMessage.update).toHaveBeenCalledWith({
      where: { id: 'email-1' },
      data: expect.objectContaining({ status: 'PENDING', attempts: 1, lastError: 'provider down' }),
    });
    expect(result).toEqual({ sent: 0, failed: 1 });
  });

  it('marks a message FAILED once it exhausts max attempts', async () => {
    prismaMock.emailMessage.findMany.mockResolvedValue([{ ...baseMessage, attempts: 4 }]);
    sendMock.mockRejectedValue(new Error('provider down'));

    await processPendingEmails();

    expect(prismaMock.emailMessage.update).toHaveBeenCalledWith({
      where: { id: 'email-1' },
      data: expect.objectContaining({ status: 'FAILED', attempts: 5 }),
    });
  });

  it('only queries PENDING messages under the max attempt count', async () => {
    prismaMock.emailMessage.findMany.mockResolvedValue([]);
    await processPendingEmails();
    expect(prismaMock.emailMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PENDING', attempts: { lt: 5 } } }),
    );
  });
});
