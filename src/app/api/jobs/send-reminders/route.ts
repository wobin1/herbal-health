import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/http/errors';
import { sendEventReminders } from '@/server/services/reminder-service';

/**
 * Triggered by an external scheduler carrying `CRON_SECRET` as a bearer
 * token. Enqueues 7-day and 1-day event reminders; idempotent per
 * registration via EmailMessage.dedupeKey, so re-running for the same
 * window never duplicates a send.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!expected || provided !== expected) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Invalid or missing job credentials');
  }

  const result = await sendEventReminders();
  return NextResponse.json(result);
}
