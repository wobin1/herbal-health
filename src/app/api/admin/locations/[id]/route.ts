import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { locationUpdateSchema } from '@/lib/validation/location';
import {
  deleteLocation,
  getLocationById,
  LocationNotFoundError,
  updateLocation,
} from '@/server/services/location-service';

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/admin/locations/[id]'>) {
  try {
    await requirePermission('locations:manage');
    const { id } = await ctx.params;
    const location = await getLocationById(id);
    return NextResponse.json({ location });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof LocationNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Location not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to load location');
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/admin/locations/[id]'>) {
  try {
    const session = await requirePermission('locations:manage');
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const parsed = locationUpdateSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, 'INVALID_INPUT', 'Invalid location payload');
    const ipAddress = request.headers.get('x-forwarded-for');
    const location = await updateLocation(id, parsed.data, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ location });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof LocationNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Location not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to update location');
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<'/api/admin/locations/[id]'>) {
  try {
    const session = await requirePermission('locations:manage');
    const { id } = await ctx.params;
    const ipAddress = request.headers.get('x-forwarded-for');
    await deleteLocation(id, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof LocationNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Location not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to delete location');
  }
}
