import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { EventNotFoundError, EventValidationError, publishEvent } from '@/server/services/event-service';

export async function POST(request: NextRequest, ctx: RouteContext<'/api/admin/events/[id]/publish'>) {
  try {
    const session = await requirePermission('events:publish');
    const { id } = await ctx.params;
    const ipAddress = request.headers.get('x-forwarded-for');
    const event = await publishEvent(id, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof EventNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Event not found');
    if (error instanceof EventValidationError) {
      return errorResponse(400, 'INCOMPLETE_EVENT', error.message);
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to publish event');
  }
}
