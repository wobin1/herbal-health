import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { adminInviteSchema } from '@/lib/validation/admin-user';
import {
  AdminUserConflictError,
  InviteDeliveryError,
  inviteAdminUser,
  listAdminUsers,
} from '@/server/services/admin-user-service';
import { parsePageParams } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('users:manage');
    const pageParams = parsePageParams(request.nextUrl.searchParams);
    const result = await listAdminUsers(pageParams);
    return NextResponse.json({ users: result.items, page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to list users');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('users:manage');
    const body = await request.json().catch(() => null);
    const parsed = adminInviteSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'INVALID_INPUT', 'Enter a valid email address and choose a role');
    }
    const ipAddress = request.headers.get('x-forwarded-for');
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
    const invite = await inviteAdminUser(parsed.data, { actorId: session.adminUser.id, ipAddress }, baseUrl);
    return NextResponse.json({ invite }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof AdminUserConflictError) return errorResponse(409, 'CONFLICT', 'An admin with that email already exists');
    if (error instanceof InviteDeliveryError) {
      console.error('[admin/users] invite email failed', error.cause);
      return errorResponse(503, 'INVITE_DELIVERY_FAILED', 'Unable to send the invitation email, please try again');
    }
    console.error('Failed to invite admin user', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to send invitation');
  }
}
