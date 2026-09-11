import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { eventCreateSchema } from '@/lib/validation/event';
import { createEvent, listAdminEvents } from '@/server/services/event-service';
import type { EventStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('events:edit');
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as EventStatus | null;
    const keyword = searchParams.get('keyword') ?? undefined;
    const events = await listAdminEvents({ status: status ?? undefined, keyword });
    return NextResponse.json({ events });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to list events');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('events:edit');
    const body = await request.json().catch(() => null);
    const parsed = eventCreateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'INVALID_INPUT', 'Invalid event payload');
    }
    const ipAddress = request.headers.get('x-forwarded-for');
    const event = await createEvent(parsed.data, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to create event');
  }
}
