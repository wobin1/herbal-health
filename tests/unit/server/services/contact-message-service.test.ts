import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/email/provider', () => ({
  getEmailProvider: () => ({ send: sendMock }),
}));

const prismaMock = {
  contactMessage: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};
vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));
const auditLogMock = vi.fn();
vi.mock('@/server/services/audit-log-service', () => ({ recordAuditLog: auditLogMock }));

const {
  sendContactMessage,
  listContactMessages,
  markContactMessageRead,
  deleteContactMessage,
  ContactMessageNotFoundError,
} = await import('@/server/services/contact-message-service');

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  prismaMock.contactMessage.create.mockResolvedValue({ id: 'msg-1' });
});

describe('sendContactMessage', () => {
  it('saves the message to the database', async () => {
    await sendContactMessage({
      name: 'Jamie Rivera',
      email: 'jamie@example.com',
      message: 'When is the next seminar in Austin?',
    });

    expect(prismaMock.contactMessage.create).toHaveBeenCalledWith({
      data: {
        name: 'Jamie Rivera',
        email: 'jamie@example.com',
        phone: null,
        message: 'When is the next seminar in Austin?',
        ipAddress: null,
      },
    });
  });

  it('stores the ip address when provided', async () => {
    await sendContactMessage(
      { name: 'Jamie', email: 'jamie@example.com', message: 'Hello' },
      { ipAddress: '203.0.113.4' },
    );

    expect(prismaMock.contactMessage.create.mock.calls[0][0].data.ipAddress).toBe('203.0.113.4');
  });

  it('still saves the message when the email provider fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('email provider down'));

    await expect(
      sendContactMessage({ name: 'Jamie', email: 'jamie@example.com', message: 'Hello' }),
    ).resolves.not.toThrow();
    expect(prismaMock.contactMessage.create).toHaveBeenCalledTimes(1);
  });

  it('sends the message to the configured contact inbox', async () => {
    await sendContactMessage({ name: 'Jamie Rivera', email: 'jamie@example.com', message: 'When is the next seminar in Austin?' });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.toEmail).toBe('hello@herbalhealthseminars.com');
    expect(call.subject).toContain('Jamie Rivera');
    expect(call.text).toContain('jamie@example.com');
    expect(call.text).toContain('When is the next seminar in Austin?');
  });

  it('uses CONTACT_INBOX_EMAIL when configured', async () => {
    vi.stubEnv('CONTACT_INBOX_EMAIL', 'seminars-team@herbalhealthseminars.com');
    await sendContactMessage({ name: 'Jamie', email: 'jamie@example.com', message: 'Hello' });

    expect(sendMock.mock.calls[0][0].toEmail).toBe('seminars-team@herbalhealthseminars.com');
  });

  it('escapes HTML special characters from user input in the HTML body', async () => {
    await sendContactMessage({
      name: '<b>Jamie</b>',
      email: 'jamie@example.com',
      message: 'Line one\n<script>alert(1)</script>',
    });

    const call = sendMock.mock.calls[0][0];
    expect(call.html).not.toContain('<script>');
    expect(call.html).toContain('&lt;script&gt;');
    expect(call.html).toContain('&lt;b&gt;Jamie&lt;/b&gt;');
  });

  it('includes the phone number when provided', async () => {
    await sendContactMessage({
      name: 'Jamie Rivera',
      email: 'jamie@example.com',
      phone: '+1 (555) 123-4567',
      message: 'Call me back please',
    });

    const call = sendMock.mock.calls[0][0];
    expect(call.text).toContain('+1 (555) 123-4567');
    expect(call.html).toContain('+1 (555) 123-4567');
  });

  it('omits the phone line when not provided', async () => {
    await sendContactMessage({ name: 'Jamie Rivera', email: 'jamie@example.com', message: 'Hello' });

    const call = sendMock.mock.calls[0][0];
    expect(call.text).not.toContain('Phone');
    expect(call.html).not.toContain('Phone');
  });
});

describe('listContactMessages', () => {
  it('returns messages newest first', async () => {
    prismaMock.contactMessage.findMany.mockResolvedValue([{ id: 'msg-1' }]);
    prismaMock.contactMessage.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const result = await listContactMessages({ page: 1, pageSize: 20 });

    expect(prismaMock.contactMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' }, skip: 0, take: 20 }),
    );
    expect(result.items).toEqual([{ id: 'msg-1' }]);
    expect(result.total).toBe(1);
    expect(result.unreadCount).toBe(1);
  });
});

describe('markContactMessageRead', () => {
  it('throws ContactMessageNotFoundError when missing', async () => {
    prismaMock.contactMessage.findUnique.mockResolvedValue(null);
    await expect(markContactMessageRead('missing', { actorId: 'admin-1' })).rejects.toThrow(
      ContactMessageNotFoundError,
    );
  });

  it('marks the message as read', async () => {
    prismaMock.contactMessage.findUnique.mockResolvedValue({ id: 'msg-1', isRead: false });
    prismaMock.contactMessage.update.mockResolvedValue({ id: 'msg-1', isRead: true });

    const result = await markContactMessageRead('msg-1', { actorId: 'admin-1' });

    expect(prismaMock.contactMessage.update).toHaveBeenCalledWith({
      where: { id: 'msg-1' },
      data: { isRead: true },
    });
    expect(result.isRead).toBe(true);
  });
});

describe('deleteContactMessage', () => {
  it('throws ContactMessageNotFoundError when missing', async () => {
    prismaMock.contactMessage.findUnique.mockResolvedValue(null);
    await expect(deleteContactMessage('missing', { actorId: 'admin-1' })).rejects.toThrow(
      ContactMessageNotFoundError,
    );
  });

  it('deletes an existing message', async () => {
    prismaMock.contactMessage.findUnique.mockResolvedValue({ id: 'msg-1' });
    await deleteContactMessage('msg-1', { actorId: 'admin-1' });
    expect(prismaMock.contactMessage.delete).toHaveBeenCalledWith({ where: { id: 'msg-1' } });
  });
});
