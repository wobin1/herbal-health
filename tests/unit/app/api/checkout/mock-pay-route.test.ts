import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = { order: { findUnique: vi.fn() } };
vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));

const ORIGINAL_ENV = { ...process.env };

function request(body: unknown, ip = '203.0.113.1') {
  return {
    text: async () => JSON.stringify(body),
    headers: new Headers({ 'x-forwarded-for': ip }),
    nextUrl: new URL('https://staging.example.com/api/checkout/mock/pay'),
  } as unknown as import('next/server').NextRequest;
}

const { POST } = await import('@/app/api/checkout/mock/pay/route');

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV, PAYMENT_PROVIDER: 'mock', PAYMENT_WEBHOOK_SECRET: 'whsec_test' };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe('POST /api/checkout/mock/pay', () => {
  it('is disabled when PAYMENT_PROVIDER is not mock', async () => {
    process.env.PAYMENT_PROVIDER = 'stripe';
    const response = await POST(request({ sessionId: 'mock_cs_1' }));
    expect(response.status).toBe(404);
  });

  it('rejects a missing session id', async () => {
    const response = await POST(request({}));
    expect(response.status).toBe(400);
    expect(prismaMock.order.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 when no order matches the session', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    const response = await POST(request({ sessionId: 'mock_cs_missing' }));
    expect(response.status).toBe(404);
  });

  it('rejects an order that is no longer pending', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      status: 'PAID',
      totalMinorUnits: 5000,
      currency: 'USD',
    });
    const response = await POST(request({ sessionId: 'mock_cs_1' }));
    expect(response.status).toBe(409);
  });

  it('signs and delivers a simulated checkout.session.completed webhook, then returns the success redirect', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      status: 'PENDING',
      totalMinorUnits: 5000,
      currency: 'USD',
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(request({ sessionId: 'mock_cs_1' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.redirectUrl).toBe('/checkout/success?session_id=mock_cs_1');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://staging.example.com/api/webhooks/stripe');
    expect(init.headers['x-mock-signature']).toEqual(expect.any(String));

    const sentPayload = JSON.parse(init.body);
    expect(sentPayload).toEqual(
      expect.objectContaining({
        type: 'checkout.session.completed',
        orderId: 'order-1',
        checkoutSessionId: 'mock_cs_1',
        amountMinorUnits: 5000,
        currency: 'USD',
      }),
    );
  });

  it('returns 502 when the simulated webhook delivery fails', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      status: 'PENDING',
      totalMinorUnits: 5000,
      currency: 'USD',
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const response = await POST(request({ sessionId: 'mock_cs_1' }));
    expect(response.status).toBe(502);
  });
});
