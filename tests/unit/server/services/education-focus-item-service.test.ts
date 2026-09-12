import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  educationalFocusItem: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
};

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));
const auditLogMock = vi.fn();
vi.mock('@/server/services/audit-log-service', () => ({ recordAuditLog: auditLogMock }));

const {
  createEducationFocusItem,
  updateEducationFocusItem,
  deleteEducationFocusItem,
  getEducationFocusItemById,
  EducationFocusItemNotFoundError,
} = await import('@/server/services/education-focus-item-service');

const ACTOR = { actorId: 'admin-1', ipAddress: '127.0.0.1' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getEducationFocusItemById', () => {
  it('throws EducationFocusItemNotFoundError when missing', async () => {
    prismaMock.educationalFocusItem.findUnique.mockResolvedValue(null);
    await expect(getEducationFocusItemById('x')).rejects.toThrow(EducationFocusItemNotFoundError);
  });
});

describe('createEducationFocusItem', () => {
  it('creates an item and records an audit log', async () => {
    prismaMock.educationalFocusItem.create.mockResolvedValue({ id: 'focus-1', title: 'Botanical Foundations' });
    const item = await createEducationFocusItem(
      { icon: 'shield', title: 'Botanical Foundations', description: 'Learn the basics.' },
      ACTOR,
    );
    expect(item.id).toBe('focus-1');
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'educationFocusItem.created', entityType: 'EducationalFocusItem' }),
    );
  });
});

describe('updateEducationFocusItem', () => {
  it('throws when the item does not exist', async () => {
    prismaMock.educationalFocusItem.findUnique.mockResolvedValue(null);
    await expect(updateEducationFocusItem('x', { title: 'New' }, ACTOR)).rejects.toThrow(
      EducationFocusItemNotFoundError,
    );
    expect(prismaMock.educationalFocusItem.update).not.toHaveBeenCalled();
  });

  it('updates and records an audit log', async () => {
    prismaMock.educationalFocusItem.findUnique.mockResolvedValue({ id: 'focus-1' });
    prismaMock.educationalFocusItem.update.mockResolvedValue({ id: 'focus-1', title: 'New' });
    const item = await updateEducationFocusItem('focus-1', { title: 'New' }, ACTOR);
    expect(item.title).toBe('New');
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'educationFocusItem.updated' }));
  });
});

describe('deleteEducationFocusItem', () => {
  it('deletes and records an audit log', async () => {
    prismaMock.educationalFocusItem.findUnique.mockResolvedValue({ id: 'focus-1' });
    prismaMock.educationalFocusItem.delete.mockResolvedValue({ id: 'focus-1' });
    await deleteEducationFocusItem('focus-1', ACTOR);
    expect(prismaMock.educationalFocusItem.delete).toHaveBeenCalledWith({ where: { id: 'focus-1' } });
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'educationFocusItem.deleted' }));
  });
});
