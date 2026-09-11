import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { locationSchema } from '@/lib/validation/location';
import { createLocation, listLocations } from '@/server/services/location-service';

export async function GET() {
  try {
    await requirePermission('locations:manage');
    const locations = await listLocations();
    return NextResponse.json({ locations });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to list locations');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('locations:manage');
    const body = await request.json().catch(() => null);
    const parsed = locationSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, 'INVALID_INPUT', 'Invalid location payload');
    const ipAddress = request.headers.get('x-forwarded-for');
    const location = await createLocation(parsed.data, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to create location');
  }
}
