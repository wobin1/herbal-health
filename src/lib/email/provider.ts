export interface SendEmailInput {
  toEmail: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<void>;
}

/**
 * Dev/test fallback used when EMAIL_PROVIDER is unset. It "succeeds" without
 * sending anything, so local development and CI don't need real credentials.
 * Never used in production: getEmailProvider() throws instead of falling
 * back to this when NODE_ENV=production.
 */
class NoopEmailProvider implements EmailProvider {
  async send(): Promise<void> {
    // Intentionally does nothing.
  }
}

/** Resend (https://resend.com) HTTP API — no SDK dependency required. */
class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(input: SendEmailInput): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: input.toEmail,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.attachments?.length && {
          attachments: input.attachments.map((a) => ({
            filename: a.filename,
            content: a.content.toString('base64'),
          })),
        }),
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Resend API error (${response.status}): ${body}`);
    }
  }
}

let cachedProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = process.env.EMAIL_PROVIDER;
  if (!providerName) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('EMAIL_PROVIDER is not configured');
    }
    cachedProvider = new NoopEmailProvider();
    return cachedProvider;
  }

  if (providerName === 'resend') {
    const apiKey = process.env.EMAIL_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      throw new Error('EMAIL_API_KEY and EMAIL_FROM are required when EMAIL_PROVIDER=resend');
    }
    cachedProvider = new ResendEmailProvider(apiKey, from);
    return cachedProvider;
  }

  throw new Error(`Unknown EMAIL_PROVIDER: ${providerName}`);
}

/** Test-only hook to reset the cached singleton between tests. */
export function _resetEmailProviderForTests(): void {
  cachedProvider = null;
}
