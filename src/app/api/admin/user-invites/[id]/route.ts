import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { InviteNotFoundError, revokeAdminInvite } from '@/server/services/admin-user-service';

export async function DELETE(request: NextRequest, ctx: RouteContext<'/api/admin/user-invites/[id]'>) {
  try {
    const session = await requirePermission('users:manage');
    const { id } = await ctx.params;
    const ipAddress = request.headers.get('x-forwarded-for');
    await revokeAdminInvite(id, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof InviteNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Invitation not found');
    console.error('Failed to revoke admin invite', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to revoke invitation');
  }
}
