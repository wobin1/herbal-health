import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, UnauthorizedError, ForbiddenError } from '@/lib/auth/require-admin';
import { errorResponse } from '@/lib/http/errors';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'focus-items');

export async function POST(request: NextRequest) {
  try {
    await requirePermission('educationFocusItems:manage');

    const formData = await request.formData().catch(() => null);
    const file = formData?.get('file');
    if (!file || !(file instanceof File)) {
      return errorResponse(400, 'INVALID_INPUT', 'No file provided');
    }

    const extension = ALLOWED_MIME_TYPES[file.type];
    if (!extension) {
      return errorResponse(400, 'INVALID_INPUT', 'Unsupported image type');
    }
    if (file.size > MAX_FILE_BYTES) {
      return errorResponse(400, 'INVALID_INPUT', 'File exceeds the 5MB size limit');
    }

    const filename = `${randomUUID()}.${extension}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), bytes);

    return NextResponse.json({ url: `/uploads/focus-items/${filename}` }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(401, 'UNAUTHENTICATED', 'Not signed in');
    if (error instanceof ForbiddenError) return errorResponse(403, 'FORBIDDEN', 'Insufficient permissions');
    return errorResponse(500, 'INTERNAL_ERROR', 'Unable to upload file');
  }
}
