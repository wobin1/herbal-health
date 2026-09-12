import { beforeEach, describe, expect, it, vi } from 'vitest';
const requirePermissionMock = vi.fn();
vi.mock('@/lib/auth/require-admin', () => ({
  requirePermission: requirePermissionMock,
  UnauthorizedError: class UnauthorizedError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
}));

const writeFileMock = vi.fn();
const mkdirMock = vi.fn();
vi.mock('node:fs/promises', () => ({
  default: { writeFile: writeFileMock, mkdir: mkdirMock },
  writeFile: writeFileMock,
  mkdir: mkdirMock,
}));

const { POST } = await import('@/app/api/admin/uploads/route');
const { UnauthorizedError } = await import('@/lib/auth/require-admin');

function requestWithFile(file: File | null, fieldName = 'file') {
  const formData = new FormData();
  if (file) formData.set(fieldName, file);
  return { formData: async () => formData } as unknown as import('next/server').NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  requirePermissionMock.mockResolvedValue({ adminUser: { id: 'admin-1' } });
});

describe('POST /api/admin/uploads', () => {
  it('rejects unauthenticated requests', async () => {
    requirePermissionMock.mockRejectedValue(new UnauthorizedError());
    const response = await POST(requestWithFile(new File(['x'], 'a.png', { type: 'image/png' })));
    expect(response.status).toBe(401);
  });

  it('rejects a request with no file', async () => {
    const response = await POST(requestWithFile(null));
    expect(response.status).toBe(400);
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('rejects disallowed mime types', async () => {
    const file = new File(['x'], 'a.txt', { type: 'text/plain' });
    const response = await POST(requestWithFile(file));
    expect(response.status).toBe(400);
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('rejects files over the size cap', async () => {
    const big = new Uint8Array(6 * 1024 * 1024);
    const file = new File([big], 'a.png', { type: 'image/png' });
    const response = await POST(requestWithFile(file));
    expect(response.status).toBe(400);
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('saves a valid image and returns its URL', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const response = await POST(requestWithFile(file));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.url).toMatch(/^\/uploads\/focus-items\/.+\.png$/);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
  });
});
