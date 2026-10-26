import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { adminUserUpdateSchema } from '@/lib/validation/admin-user';
import {
  AdminUserNotFoundError,
  AdminUserRuleError,
  updateAdminUser,
} from '@/server/services/admin-user-service';

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/admin/users/[id]'>) {
  try {
    const session = await requirePermission('users:manage');
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const parsed = adminUserUpdateSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, 'INVALID_INPUT', 'Invalid user payload');
    const ipAddress = request.headers.get('x-forwarded-for');
    const user = await updateAdminUser(id, parsed.data, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof AdminUserNotFoundError) return errorResponse(404, 'NOT_FOUND', 'User not found');
    if (error instanceof AdminUserRuleError) return errorResponse(422, 'RULE_VIOLATION', error.message);
    console.error('Failed to update admin user', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to update user');
  }
}
