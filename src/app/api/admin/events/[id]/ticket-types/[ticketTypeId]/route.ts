import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { eventTicketTypeSchema } from '@/lib/validation/event';
import { deleteTicketType, EventNotFoundError, updateTicketType } from '@/server/services/event-service';

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/admin/events/[id]/ticket-types/[ticketTypeId]'>,
) {
  try {
    const session = await requirePermission('events:edit');
    const { id, ticketTypeId } = await ctx.params;
    const body = await request.json().catch(() => null);
    const parsed = eventTicketTypeSchema.partial().safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'INVALID_INPUT', 'Invalid ticket type payload');
    }
    const ipAddress = request.headers.get('x-forwarded-for');
    const ticketType = await updateTicketType(id, ticketTypeId, parsed.data, {
      actorId: session.adminUser.id,
      ipAddress,
    });
    return NextResponse.json({ ticketType });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof EventNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Ticket type not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to update ticket type');
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/admin/events/[id]/ticket-types/[ticketTypeId]'>,
) {
  try {
    const session = await requirePermission('events:edit');
    const { id, ticketTypeId } = await ctx.params;
    const ipAddress = request.headers.get('x-forwarded-for');
    await deleteTicketType(id, ticketTypeId, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof EventNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Ticket type not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to delete ticket type');
  }
}
