import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/http/errors';
import { expireStaleReservations } from '@/server/services/reservation-cleanup-service';

/**
 * Triggered by an external scheduler (e.g. a cron-based platform job)
 * carrying `CRON_SECRET` as a bearer token. Releases inventory for PENDING
 * orders whose reservation window has expired.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!expected || provided !== expected) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Invalid or missing job credentials');
  }

  const result = await expireStaleReservations();
  return NextResponse.json({ expiredCount: result.expiredOrderIds.length });
}
