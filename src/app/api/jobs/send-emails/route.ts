import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/http/errors';
import { processPendingEmails } from '@/server/services/email-queue-service';

/**
 * Triggered by an external scheduler carrying `CRON_SECRET` as a bearer
 * token. Drains the email outbox, sending each PENDING message via the
 * configured provider and retrying failed sends on the next run.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!expected || provided !== expected) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Invalid or missing job credentials');
  }

  const result = await processPendingEmails();
  return NextResponse.json(result);
}
