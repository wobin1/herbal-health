import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { galleryImageSchema } from '@/lib/validation/gallery-image';
import { createGalleryImage, listGalleryImages } from '@/server/services/gallery-service';
import { parsePageParams } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('gallery:manage');
    const pageParams = parsePageParams(request.nextUrl.searchParams);
    const result = await listGalleryImages(pageParams);
    return NextResponse.json({ items: result.items, page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to list gallery images');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission('gallery:manage');
    const body = await request.json().catch(() => null);
    const parsed = galleryImageSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, 'INVALID_INPUT', 'Invalid gallery image payload');
    const ipAddress = request.headers.get('x-forwarded-for');
    const item = await createGalleryImage(parsed.data, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to create gallery image');
  }
}
