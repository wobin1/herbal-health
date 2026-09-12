import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import {
  deleteContactMessage,
  markContactMessageRead,
  ContactMessageNotFoundError,
} from '@/server/services/contact-message-service';

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/admin/contact-messages/[id]'>) {
  try {
    const session = await requirePermission('contactMessages:manage');
    const { id } = await ctx.params;
    const ipAddress = request.headers.get('x-forwarded-for');
    const message = await markContactMessageRead(id, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof ContactMessageNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Contact message not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to update contact message');
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<'/api/admin/contact-messages/[id]'>) {
  try {
    const session = await requirePermission('contactMessages:manage');
    const { id } = await ctx.params;
    const ipAddress = request.headers.get('x-forwarded-for');
    await deleteContactMessage(id, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof ContactMessageNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Contact message not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to delete contact message');
  }
}
