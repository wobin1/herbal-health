import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/http/errors';
import { getClientKey, rateLimit } from '@/lib/http/rate-limit';
import { buildTicketsPdf } from '@/lib/tickets/pdf';
import { getOrderConfirmation } from '@/server/services/order-service';

/**
 * The unguessable Stripe checkout session id acts as the capability, same as
 * the success page. Only PAID orders with minted tickets produce a PDF.
 */
export async function GET(request: NextRequest) {
  if (!rateLimit(`ticket-pdf:${getClientKey(request)}`, 20, 60_000).allowed) {
    return errorResponse(429, 'RATE_LIMITED', 'Too many requests, try again shortly');
  }
  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId || sessionId.length > 255) {
    return errorResponse(400, 'INVALID_INPUT', 'session_id is required');
  }
  const confirmation = await getOrderConfirmation(sessionId);
  if (!confirmation || confirmation.status !== 'PAID' || confirmation.tickets.length === 0) {
    return errorResponse(404, 'NOT_FOUND', 'Tickets not found');
  }
  const pdf = await buildTicketsPdf(confirmation.event, confirmation.tickets);
  return new Response(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="tickets.pdf"',
      'Cache-Control': 'private, no-store',
    },
  });
}
