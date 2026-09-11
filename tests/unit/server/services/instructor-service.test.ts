import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  instructor: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
};

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));
const auditLogMock = vi.fn();
vi.mock('@/server/services/audit-log-service', () => ({ recordAuditLog: auditLogMock }));

const { createInstructor, updateInstructor, deleteInstructor, getInstructorById, InstructorNotFoundError } =
  await import('@/server/services/instructor-service');

const ACTOR = { actorId: 'admin-1', ipAddress: '127.0.0.1' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getInstructorById', () => {
  it('throws InstructorNotFoundError when missing', async () => {
    prismaMock.instructor.findUnique.mockResolvedValue(null);
    await expect(getInstructorById('x')).rejects.toThrow(InstructorNotFoundError);
  });
});

describe('createInstructor', () => {
  it('creates an instructor and records an audit log', async () => {
    prismaMock.instructor.create.mockResolvedValue({ id: 'ins-1', name: 'Dr. Goodman' });
    const instructor = await createInstructor(
      { slug: 'dr-goodman', name: 'Dr. Goodman', shortBio: 'Short', fullBio: 'Full' },
      ACTOR,
    );
    expect(instructor.id).toBe('ins-1');
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'instructor.created', entityType: 'Instructor' }),
    );
  });
});

describe('updateInstructor', () => {
  it('throws when the instructor does not exist', async () => {
    prismaMock.instructor.findUnique.mockResolvedValue(null);
    await expect(updateInstructor('x', { name: 'New' }, ACTOR)).rejects.toThrow(InstructorNotFoundError);
    expect(prismaMock.instructor.update).not.toHaveBeenCalled();
  });

  it('updates and records an audit log', async () => {
    prismaMock.instructor.findUnique.mockResolvedValue({ id: 'ins-1' });
    prismaMock.instructor.update.mockResolvedValue({ id: 'ins-1', name: 'New' });
    const instructor = await updateInstructor('ins-1', { name: 'New' }, ACTOR);
    expect(instructor.name).toBe('New');
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'instructor.updated' }));
  });
});

describe('deleteInstructor', () => {
  it('deletes and records an audit log', async () => {
    prismaMock.instructor.findUnique.mockResolvedValue({ id: 'ins-1' });
    prismaMock.instructor.delete.mockResolvedValue({ id: 'ins-1' });
    await deleteInstructor('ins-1', ACTOR);
    expect(prismaMock.instructor.delete).toHaveBeenCalledWith({ where: { id: 'ins-1' } });
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'instructor.deleted' }));
  });
});
