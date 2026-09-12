import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/http/errors';
import { getClientKey, rateLimit } from '@/lib/http/rate-limit';
import { registrationLookupSchema } from '@/lib/validation/checkout';
import { findRegistrationByReferenceAndEmail } from '@/server/services/registration-service';

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

export async function GET(request: NextRequest) {
  const key = `reg-lookup:${getClientKey(request)}`;
  if (!rateLimit(key, RATE_LIMIT, RATE_WINDOW_MS).allowed) {
    return errorResponse(429, 'RATE_LIMITED', 'Too many lookup attempts, try again shortly');
  }

  const parsed = registrationLookupSchema.safeParse({
    reference: request.nextUrl.searchParams.get('reference'),
    email: request.nextUrl.searchParams.get('email'),
  });
  if (!parsed.success) {
    return errorResponse(400, 'INVALID_INPUT', 'Reference and email are required');
  }

  const registration = await findRegistrationByReferenceAndEmail(parsed.data.reference, parsed.data.email);
  if (!registration) {
    return errorResponse(404, 'NOT_FOUND', 'Registration not found');
  }

  return NextResponse.json({ registration });
}
