import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { resendRegistrationConfirmation, RegistrationNotFoundError } from '@/server/services/registration-service';

export async function POST(request: NextRequest, ctx: RouteContext<'/api/admin/registrations/[id]/resend'>) {
  try {
    const session = await requirePermission('attendees:viewPii');
    const { id } = await ctx.params;
    const ipAddress = request.headers.get('x-forwarded-for');
    await resendRegistrationConfirmation(id, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof RegistrationNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Registration not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to resend confirmation');
  }
}
