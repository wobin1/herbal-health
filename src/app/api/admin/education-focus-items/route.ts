import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { educationFocusItemSchema } from '@/lib/validation/education-focus-item';
import { createEducationFocusItem, listEducationFocusItems } from '@/server/services/education-focus-item-service';
import { parsePageParams } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('educationFocusItems:manage');
    const pageParams = parsePageParams(request.nextUrl.searchParams);
    const result = await listEducationFocusItems(pageParams);
    return NextResponse.json({ items: result.items, page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to list education focus items');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('educationFocusItems:manage');
    const body = await request.json().catch(() => null);
    const parsed = educationFocusItemSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, 'INVALID_INPUT', 'Invalid education focus item payload');
    const ipAddress = request.headers.get('x-forwarded-for');
    const item = await createEducationFocusItem(parsed.data, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to create education focus item');
  }
}
