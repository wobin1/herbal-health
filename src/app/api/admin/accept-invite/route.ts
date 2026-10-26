import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/http/errors';
import { getClientKey, rateLimit } from '@/lib/http/rate-limit';
import { acceptInviteSchema } from '@/lib/validation/admin-user';
import { acceptInvite, InvalidInviteError } from '@/server/services/admin-user-service';

const MAX_BODY_BYTES = 4 * 1024;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 15 * 60_000;

/** Public: the invite token is the credential. */
export async function POST(request: NextRequest) {
  const key = `accept-invite:${getClientKey(request)}`;
  if (!rateLimit(key, RATE_LIMIT, RATE_WINDOW_MS).allowed) {
    return errorResponse(429, 'RATE_LIMITED', 'Too many attempts, try again later');
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

  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, 'INVALID_INPUT', 'Choose a password of at least 12 characters');
  }

  try {
    await acceptInvite(parsed.data.token, parsed.data.password, {
      ipAddress: request.headers.get('x-forwarded-for'),
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidInviteError) {
      return errorResponse(400, 'INVALID_INVITE', 'This invitation link is invalid or has expired');
    }
    console.error('[admin/accept-invite] unexpected error', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to accept invitation');
  }
}
