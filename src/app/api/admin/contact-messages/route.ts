import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { listContactMessages } from '@/server/services/contact-message-service';
import { parsePageParams } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('contactMessages:manage');
    const pageParams = parsePageParams(request.nextUrl.searchParams);
    const { items, unreadCount, page, pageSize, total, totalPages } = await listContactMessages(pageParams);
    return NextResponse.json({ messages: items, unreadCount, page, pageSize, total, totalPages });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to list contact messages');
  }
}
