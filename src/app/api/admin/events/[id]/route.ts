import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { eventUpdateSchema } from '@/lib/validation/event';
import {
  deleteEvent,
  EventNotFoundError,
  EventValidationError,
  getAdminEventById,
  updateEvent,
} from '@/server/services/event-service';

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/admin/events/[id]'>) {
  try {
    await requirePermission('events:edit');
    const { id } = await ctx.params;
    const event = await getAdminEventById(id);
    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof EventNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Event not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to load event');
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/admin/events/[id]'>) {
  try {
    const session = await requirePermission('events:edit');
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const parsed = eventUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'INVALID_INPUT', 'Invalid event payload');
    }
    const ipAddress = request.headers.get('x-forwarded-for');
    const event = await updateEvent(id, parsed.data, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof EventNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Event not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to update event');
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<'/api/admin/events/[id]'>) {
  try {
    const session = await requirePermission('events:edit');
    const { id } = await ctx.params;
    const ipAddress = request.headers.get('x-forwarded-for');
    await deleteEvent(id, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof EventNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Event not found');
    if (error instanceof EventValidationError) return errorResponse(400, 'INVALID_STATE', error.message);
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to delete event');
  }
}
