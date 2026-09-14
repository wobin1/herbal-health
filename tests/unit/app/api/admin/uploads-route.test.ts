import { beforeEach, describe, expect, it, vi } from 'vitest';
const requirePermissionMock = vi.fn();
vi.mock('@/lib/auth/require-admin', () => ({
  requirePermission: requirePermissionMock,
  UnauthorizedError: class UnauthorizedError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

const uploadImageToCloudinaryMock = vi.fn();
vi.mock('@/lib/cloudinary', () => ({
  uploadImageToCloudinary: uploadImageToCloudinaryMock,
}));

const { POST } = await import('@/app/api/admin/uploads/route');
const { UnauthorizedError, ForbiddenError } = await import('@/lib/auth/require-admin');

function requestWithFile(file: File | null, folder?: string, fieldName = 'file') {
  const formData = new FormData();
  if (file) formData.set(fieldName, file);
  if (folder !== undefined) formData.set('folder', folder);
  return { formData: async () => formData } as unknown as import('next/server').NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  requirePermissionMock.mockResolvedValue({ adminUser: { id: 'admin-1' } });
  uploadImageToCloudinaryMock.mockImplementation(async (_bytes: Buffer, folder: string) => ({
    url: `https://res.cloudinary.com/demo/image/upload/v1/herbal-health/${folder}/mock-id.png`,
    publicId: `herbal-health/${folder}/mock-id`,
  }));
});

describe('POST /api/admin/uploads', () => {
  it('rejects unauthenticated requests', async () => {
    requirePermissionMock.mockRejectedValue(new UnauthorizedError());
    const response = await POST(requestWithFile(new File(['x'], 'a.png', { type: 'image/png' }), 'focus-items'));
    expect(response.status).toBe(401);
  });

  it('rejects a request with no file', async () => {
    const response = await POST(requestWithFile(null, 'focus-items'));
    expect(response.status).toBe(400);
    expect(uploadImageToCloudinaryMock).not.toHaveBeenCalled();
  });

  it('rejects disallowed mime types', async () => {
    const file = new File(['x'], 'a.txt', { type: 'text/plain' });
    const response = await POST(requestWithFile(file, 'focus-items'));
    expect(response.status).toBe(400);
    expect(uploadImageToCloudinaryMock).not.toHaveBeenCalled();
  });

  it('rejects files over the size cap', async () => {
    const big = new Uint8Array(6 * 1024 * 1024);
    const file = new File([big], 'a.png', { type: 'image/png' });
    const response = await POST(requestWithFile(file, 'focus-items'));
    expect(response.status).toBe(400);
    expect(uploadImageToCloudinaryMock).not.toHaveBeenCalled();
  });

  it('rejects an unknown folder', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const response = await POST(requestWithFile(file, 'not-a-real-folder'));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('INVALID_INPUT');
    expect(uploadImageToCloudinaryMock).not.toHaveBeenCalled();
  });

  it('defaults to focus-items when no folder is given (backward compat)', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const response = await POST(requestWithFile(file));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.url).toMatch(/^https:\/\/res\.cloudinary\.com\/.+\/herbal-health\/focus-items\//);
    expect(requirePermissionMock).toHaveBeenCalledWith('educationFocusItems:manage');
  });

  it('saves a valid image for focus-items and returns its URL', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const response = await POST(requestWithFile(file, 'focus-items'));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.url).toMatch(/^https:\/\/res\.cloudinary\.com\/.+\/herbal-health\/focus-items\//);
    expect(requirePermissionMock).toHaveBeenCalledWith('educationFocusItems:manage');
    expect(uploadImageToCloudinaryMock).toHaveBeenCalledWith(expect.any(Buffer), 'focus-items');
  });

  it('saves a valid image for events and requires events:edit', async () => {
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    const response = await POST(requestWithFile(file, 'events'));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.url).toMatch(/^https:\/\/res\.cloudinary\.com\/.+\/herbal-health\/events\//);
    expect(requirePermissionMock).toHaveBeenCalledWith('events:edit');
  });

  it('saves a valid image for gallery and requires gallery:manage', async () => {
    const file = new File(['x'], 'a.webp', { type: 'image/webp' });
    const response = await POST(requestWithFile(file, 'gallery'));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.url).toMatch(/^https:\/\/res\.cloudinary\.com\/.+\/herbal-health\/gallery\//);
    expect(requirePermissionMock).toHaveBeenCalledWith('gallery:manage');
  });

  it('returns 403 when the permission for the folder is missing', async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError());
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const response = await POST(requestWithFile(file, 'gallery'));
    expect(response.status).toBe(403);
  });

  it('returns 500 when the Cloudinary upload fails', async () => {
    uploadImageToCloudinaryMock.mockRejectedValue(new Error('cloudinary down'));
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const response = await POST(requestWithFile(file, 'focus-items'));
    expect(response.status).toBe(500);
  });
});
