import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { instructorSchema } from '@/lib/validation/instructor';
import { createInstructor, listInstructors } from '@/server/services/instructor-service';
import { parsePageParams } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('instructors:manage');
    const pageParams = parsePageParams(request.nextUrl.searchParams);
    const result = await listInstructors(pageParams);
    return NextResponse.json({ instructors: result.items, page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to list instructors');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('instructors:manage');
    const body = await request.json().catch(() => null);
    const parsed = instructorSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, 'INVALID_INPUT', 'Invalid instructor payload');
    const ipAddress = request.headers.get('x-forwarded-for');
    const instructor = await createInstructor(parsed.data, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ instructor }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to create instructor');
  }
}
