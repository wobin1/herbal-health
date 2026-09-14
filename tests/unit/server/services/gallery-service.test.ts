import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  galleryImage: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
};

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));
const auditLogMock = vi.fn();
vi.mock('@/server/services/audit-log-service', () => ({ recordAuditLog: auditLogMock }));

const {
  listGalleryImages,
  listPublishedGalleryImages,
  createGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  getGalleryImageById,
  GalleryImageNotFoundError,
} = await import('@/server/services/gallery-service');

const ACTOR = { actorId: 'admin-1', ipAddress: '127.0.0.1' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getGalleryImageById', () => {
  it('throws GalleryImageNotFoundError when missing', async () => {
    prismaMock.galleryImage.findUnique.mockResolvedValue(null);
    await expect(getGalleryImageById('x')).rejects.toThrow(GalleryImageNotFoundError);
  });
});

describe('listGalleryImages', () => {
  it('orders by sortOrder asc and paginates', async () => {
    prismaMock.galleryImage.findMany.mockResolvedValue([{ id: 'g1' }]);
    prismaMock.galleryImage.count.mockResolvedValue(1);
    const result = await listGalleryImages({ page: 1, pageSize: 20 });
    expect(prismaMock.galleryImage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { sortOrder: 'asc' } }),
    );
    expect(result.total).toBe(1);
  });
});

describe('listPublishedGalleryImages', () => {
  it('filters to published only, ordered by sortOrder asc', async () => {
    prismaMock.galleryImage.findMany.mockResolvedValue([{ id: 'g1', published: true }]);
    await listPublishedGalleryImages();
    expect(prismaMock.galleryImage.findMany).toHaveBeenCalledWith({
      where: { published: true },
      orderBy: { sortOrder: 'asc' },
    });
  });
});

describe('createGalleryImage', () => {
  it('creates an image and records an audit log', async () => {
    prismaMock.galleryImage.create.mockResolvedValue({ id: 'gallery-1', url: 'https://picsum.photos/1' });
    const item = await createGalleryImage({ url: 'https://picsum.photos/1' }, ACTOR);
    expect(item.id).toBe('gallery-1');
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'gallery.created', entityType: 'GalleryImage' }),
    );
  });
});

describe('updateGalleryImage', () => {
  it('throws when the image does not exist', async () => {
    prismaMock.galleryImage.findUnique.mockResolvedValue(null);
    await expect(updateGalleryImage('x', { caption: 'New' }, ACTOR)).rejects.toThrow(GalleryImageNotFoundError);
    expect(prismaMock.galleryImage.update).not.toHaveBeenCalled();
  });

  it('updates and records an audit log', async () => {
    prismaMock.galleryImage.findUnique.mockResolvedValue({ id: 'gallery-1' });
    prismaMock.galleryImage.update.mockResolvedValue({ id: 'gallery-1', caption: 'New' });
    const item = await updateGalleryImage('gallery-1', { caption: 'New' }, ACTOR);
    expect(item.caption).toBe('New');
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'gallery.updated' }));
  });
});

describe('deleteGalleryImage', () => {
  it('deletes and records an audit log', async () => {
    prismaMock.galleryImage.findUnique.mockResolvedValue({ id: 'gallery-1' });
    prismaMock.galleryImage.delete.mockResolvedValue({ id: 'gallery-1' });
    await deleteGalleryImage('gallery-1', ACTOR);
    expect(prismaMock.galleryImage.delete).toHaveBeenCalledWith({ where: { id: 'gallery-1' } });
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'gallery.deleted' }));
  });
});
