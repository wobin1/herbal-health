import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';
import { galleryImageUpdateSchema } from '@/lib/validation/gallery-image';
import {
  deleteGalleryImage,
  getGalleryImageById,
  GalleryImageNotFoundError,
  updateGalleryImage,
} from '@/server/services/gallery-service';

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/admin/gallery/[id]'>) {
  try {
    await requirePermission('gallery:manage');
    const { id } = await ctx.params;
    const item = await getGalleryImageById(id);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof GalleryImageNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Gallery image not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to load gallery image');
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/admin/gallery/[id]'>) {
  try {
    const session = await requirePermission('gallery:manage');
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const parsed = galleryImageUpdateSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, 'INVALID_INPUT', 'Invalid gallery image payload');
    const ipAddress = request.headers.get('x-forwarded-for');
    const item = await updateGalleryImage(id, parsed.data, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof GalleryImageNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Gallery image not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to update gallery image');
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<'/api/admin/gallery/[id]'>) {
  try {
    const session = await requirePermission('gallery:manage');
    const { id } = await ctx.params;
    const ipAddress = request.headers.get('x-forwarded-for');
    await deleteGalleryImage(id, { actorId: session.adminUser.id, ipAddress });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    if (error instanceof GalleryImageNotFoundError) return errorResponse(404, 'NOT_FOUND', 'Gallery image not found');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to delete gallery image');
  }
}
