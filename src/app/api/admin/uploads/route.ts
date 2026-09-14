import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import type { Permission } from '@/lib/auth/rbac';
import { errorResponse } from '@/lib/http/errors';
import { uploadImageToCloudinary } from '@/lib/cloudinary';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const UPLOAD_FOLDERS = ['focus-items', 'events', 'gallery'] as const;
type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

const PERMISSION_BY_FOLDER: Record<UploadFolder, Permission> = {
  'focus-items': 'educationFocusItems:manage',
  events: 'events:edit',
  gallery: 'gallery:manage',
};

function isUploadFolder(value: unknown): value is UploadFolder {
  return typeof value === 'string' && (UPLOAD_FOLDERS as readonly string[]).includes(value);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData().catch(() => null);
    const folderInput = formData?.get('folder');
    const folder: UploadFolder = folderInput === null || folderInput === undefined ? 'focus-items' : (folderInput as string) as UploadFolder;
    if (!isUploadFolder(folder)) {
      return errorResponse(400, 'INVALID_INPUT', 'Unsupported upload folder');
    }

    await requirePermission(PERMISSION_BY_FOLDER[folder]);

    const file = formData?.get('file');
    if (!file || !(file instanceof File)) {
      return errorResponse(400, 'INVALID_INPUT', 'No file provided');
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return errorResponse(400, 'INVALID_INPUT', 'Unsupported image type');
    }
    if (file.size > MAX_FILE_BYTES) {
      return errorResponse(400, 'INVALID_INPUT', 'File exceeds the 5MB size limit');
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadImageToCloudinary(bytes, folder);

    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to upload file');
  }
}
