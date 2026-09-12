import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendContactMessageMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/server/services/contact-message-service', () => ({
  sendContactMessage: sendContactMessageMock,
}));

const { POST } = await import('@/app/api/contact/route');

function request(body: unknown, ip = '203.0.113.1') {
  return {
    text: async () => JSON.stringify(body),
    headers: new Headers({ 'x-forwarded-for': ip }),
  } as unknown as import('next/server').NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/contact', () => {
  it('rejects an invalid payload', async () => {
    const response = await POST(request({ name: '', email: 'not-an-email', message: '' }));
    expect(response.status).toBe(400);
    expect(sendContactMessageMock).not.toHaveBeenCalled();
  });

  it('sends a valid message and returns 201', async () => {
    const response = await POST(
      request({ name: 'Jamie Rivera', email: 'jamie@example.com', message: 'When is the next seminar?' }),
    );
    expect(response.status).toBe(201);
    expect(sendContactMessageMock).toHaveBeenCalledWith(
      {
        name: 'Jamie Rivera',
        email: 'jamie@example.com',
        message: 'When is the next seminar?',
      },
      { ipAddress: '203.0.113.1' },
    );
  });

  it('accepts an optional phone number', async () => {
    const response = await POST(
      request(
        { name: 'Jamie Rivera', email: 'jamie@example.com', phone: '+1 (555) 123-4567', message: 'Call me' },
        '203.0.113.5',
      ),
    );
    expect(response.status).toBe(201);
    expect(sendContactMessageMock).toHaveBeenCalledWith(
      {
        name: 'Jamie Rivera',
        email: 'jamie@example.com',
        phone: '+1 (555) 123-4567',
        message: 'Call me',
      },
      { ipAddress: '203.0.113.5' },
    );
  });

  it('rate-limits repeated requests from the same client', async () => {
    const ip = '198.51.100.7';
    let last;
    for (let i = 0; i < 6; i += 1) {
      last = await POST(
        request({ name: 'Jamie', email: 'jamie@example.com', message: 'Hello there' }, ip),
      );
    }
    expect(last!.status).toBe(429);
  });

  it('returns 502 when the email provider fails', async () => {
    sendContactMessageMock.mockRejectedValueOnce(new Error('boom'));
    const response = await POST(
      request(
        { name: 'Jamie Rivera', email: 'jamie@example.com', message: 'When is the next seminar?' },
        '203.0.113.9',
      ),
    );
    expect(response.status).toBe(502);
  });
});
