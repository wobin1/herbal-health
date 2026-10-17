import { beforeEach, describe, expect, it, vi } from 'vitest';

const parseWebhookEventMock = vi.fn();
vi.mock('@/lib/payments/provider', () => ({
  getPaymentProvider: () => ({ parseWebhookEvent: parseWebhookEventMock }),
}));

const processCheckoutCompletedMock = vi.fn();
const processCheckoutExpiredMock = vi.fn();
vi.mock('@/server/services/payment-webhook-service', () => ({
  processCheckoutCompleted: processCheckoutCompletedMock,
  processCheckoutExpired: processCheckoutExpiredMock,
}));

const processPendingEmailsMock = vi.fn();
vi.mock('@/server/services/email-queue-service', () => ({
  processPendingEmails: processPendingEmailsMock,
}));

// Run `after` callbacks immediately so the test can observe them.
const afterCallbacks: Array<() => Promise<void> | void> = [];
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (callback: () => Promise<void> | void) => {
    afterCallbacks.push(callback);
  },
}));

const { POST } = await import('@/app/api/webhooks/stripe/route');

function request() {
  return {
    text: async () => '{}',
    headers: new Headers({ 'stripe-signature': 'sig' }),
  } as unknown as import('next/server').NextRequest;
}

async function runAfterCallbacks() {
  for (const callback of afterCallbacks.splice(0)) await callback();
}

beforeEach(() => {
  vi.clearAllMocks();
  afterCallbacks.length = 0;
});

describe('POST /api/webhooks/stripe', () => {
  it('sends queued emails after a newly processed checkout completion', async () => {
    parseWebhookEventMock.mockReturnValue({ type: 'checkout.session.completed' });
    processCheckoutCompletedMock.mockResolvedValue({ duplicate: false });

    const response = await POST(request());
    expect(response.status).toBe(200);
    await runAfterCallbacks();

    expect(processPendingEmailsMock).toHaveBeenCalledTimes(1);
  });

  it('does not send emails for a duplicate delivery', async () => {
    parseWebhookEventMock.mockReturnValue({ type: 'checkout.session.completed' });
    processCheckoutCompletedMock.mockResolvedValue({ duplicate: true });

    await POST(request());
    await runAfterCallbacks();

    expect(processPendingEmailsMock).not.toHaveBeenCalled();
  });

  it('never fails the webhook when email sending throws', async () => {
    parseWebhookEventMock.mockReturnValue({ type: 'checkout.session.completed' });
    processCheckoutCompletedMock.mockResolvedValue({ duplicate: false });
    processPendingEmailsMock.mockRejectedValue(new Error('smtp down'));

    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(runAfterCallbacks()).resolves.toBeUndefined();
  });

  it('sends queued emails after an expired checkout so the buyer gets the failure notice', async () => {
    parseWebhookEventMock.mockReturnValue({ type: 'checkout.session.expired' });
    processCheckoutExpiredMock.mockResolvedValue(undefined);

    await POST(request());
    await runAfterCallbacks();

    expect(processPendingEmailsMock).toHaveBeenCalledTimes(1);
  });
});
