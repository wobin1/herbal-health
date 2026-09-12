import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/http/errors';
import { getClientKey, rateLimit } from '@/lib/http/rate-limit';
import { contactMessageSchema } from '@/lib/validation/contact';
import { sendContactMessage } from '@/server/services/contact-message-service';

const MAX_BODY_BYTES = 8 * 1024;
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  const key = `contact:${getClientKey(request)}`;
  if (!rateLimit(key, RATE_LIMIT, RATE_WINDOW_MS).allowed) {
    return errorResponse(429, 'RATE_LIMITED', 'Too many messages sent, try again shortly');
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return errorResponse(413, 'PAYLOAD_TOO_LARGE', 'Request body too large');
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON');
  }

  const parsed = contactMessageSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, 'INVALID_INPUT', 'Please fill in your name, email, and message');
  }

  try {
    await sendContactMessage(parsed.data, { ipAddress: request.headers.get('x-forwarded-for') });
  } catch {
    return errorResponse(502, 'SEND_FAILED', 'We could not send your message, please try again');
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
