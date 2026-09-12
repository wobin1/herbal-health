import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { educationFocusItemUpdateSchema } from '@/lib/validation/education-focus-item';
import {
  deleteEducationFocusItem,
  getEducationFocusItemById,
  EducationFocusItemNotFoundError,
  updateEducationFocusItem,
} from '@/server/services/education-focus-item-service';

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/admin/education-focus-items/[id]'>) {
  try {
    await requirePermission('educationFocusItems:manage');
    const { id } = await ctx.params;
    const item = await getEducationFocusItemById(id);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof EducationFocusItemNotFoundError)
      return errorResponse(404, 'NOT_FOUND', 'Education focus item not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to load education focus item');
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/admin/education-focus-items/[id]'>) {
  try {
    const session = await requirePermission('educationFocusItems:manage');
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const parsed = educationFocusItemUpdateSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, 'INVALID_INPUT', 'Invalid education focus item payload');
    const ipAddress = request.headers.get('x-forwarded-for');
    const item = await updateEducationFocusItem(id, parsed.data, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof EducationFocusItemNotFoundError)
      return errorResponse(404, 'NOT_FOUND', 'Education focus item not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to update education focus item');
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<'/api/admin/education-focus-items/[id]'>) {
  try {
    const session = await requirePermission('educationFocusItems:manage');
    const { id } = await ctx.params;
    const ipAddress = request.headers.get('x-forwarded-for');
    await deleteEducationFocusItem(id, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof EducationFocusItemNotFoundError)
      return errorResponse(404, 'NOT_FOUND', 'Education focus item not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to delete education focus item');
  }
}
