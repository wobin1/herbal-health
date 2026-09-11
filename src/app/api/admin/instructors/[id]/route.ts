import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { instructorUpdateSchema } from '@/lib/validation/instructor';
import {
  deleteInstructor,
  getInstructorById,
  InstructorNotFoundError,
  updateInstructor,
} from '@/server/services/instructor-service';

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/admin/instructors/[id]'>) {
  try {
    await requirePermission('instructors:manage');
    const { id } = await ctx.params;
    const instructor = await getInstructorById(id);
    return NextResponse.json({ instructor });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof InstructorNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Instructor not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to load instructor');
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/admin/instructors/[id]'>) {
  try {
    const session = await requirePermission('instructors:manage');
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const parsed = instructorUpdateSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, 'INVALID_INPUT', 'Invalid instructor payload');
    const ipAddress = request.headers.get('x-forwarded-for');
    const instructor = await updateInstructor(id, parsed.data, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ instructor });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof InstructorNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Instructor not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to update instructor');
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<'/api/admin/instructors/[id]'>) {
  try {
    const session = await requirePermission('instructors:manage');
    const { id } = await ctx.params;
    const ipAddress = request.headers.get('x-forwarded-for');
    await deleteInstructor(id, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof InstructorNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Instructor not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to delete instructor');
  }
}
