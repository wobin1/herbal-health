import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { transferAttendeeSchema } from '@/lib/validation/attendees';
import { transferRegistration, RegistrationNotFoundError } from '@/server/services/registration-service';

export async function POST(request: NextRequest, ctx: RouteContext<'/api/admin/registrations/[id]/transfer'>) {
  try {
    const session = await requirePermission('attendees:viewPii');
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const parsed = transferAttendeeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'INVALID_INPUT', 'Invalid attendee payload');
    }
    const ipAddress = request.headers.get('x-forwarded-for');
    await transferRegistration(id, parsed.data, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof RegistrationNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Registration not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to transfer registration');
  }
}
