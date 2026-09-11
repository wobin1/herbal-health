import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  location: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
};

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));
const auditLogMock = vi.fn();
vi.mock('@/server/services/audit-log-service', () => ({ recordAuditLog: auditLogMock }));

const { createLocation, updateLocation, deleteLocation, getLocationById, LocationNotFoundError } =
  await import('@/server/services/location-service');

const ACTOR = { actorId: 'admin-1', ipAddress: '127.0.0.1' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getLocationById', () => {
  it('throws LocationNotFoundError when missing', async () => {
    prismaMock.location.findUnique.mockResolvedValue(null);
    await expect(getLocationById('x')).rejects.toThrow(LocationNotFoundError);
  });
});

describe('createLocation', () => {
  it('creates a location and records an audit log', async () => {
    prismaMock.location.create.mockResolvedValue({ id: 'loc-1', name: 'Hall' });
    const location = await createLocation({ name: 'Hall', address: '1 Main', city: 'Austin', state: 'TX', country: 'US' }, ACTOR);
    expect(location.id).toBe('loc-1');
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'location.created', entityType: 'Location' }));
  });
});

describe('updateLocation', () => {
  it('throws when the location does not exist', async () => {
    prismaMock.location.findUnique.mockResolvedValue(null);
    await expect(updateLocation('x', { name: 'New' }, ACTOR)).rejects.toThrow(LocationNotFoundError);
    expect(prismaMock.location.update).not.toHaveBeenCalled();
  });

  it('updates and records an audit log', async () => {
    prismaMock.location.findUnique.mockResolvedValue({ id: 'loc-1' });
    prismaMock.location.update.mockResolvedValue({ id: 'loc-1', name: 'New' });
    const location = await updateLocation('loc-1', { name: 'New' }, ACTOR);
    expect(location.name).toBe('New');
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'location.updated' }));
  });
});

describe('deleteLocation', () => {
  it('deletes and records an audit log', async () => {
    prismaMock.location.findUnique.mockResolvedValue({ id: 'loc-1' });
    prismaMock.location.delete.mockResolvedValue({ id: 'loc-1' });
    await deleteLocation('loc-1', ACTOR);
    expect(prismaMock.location.delete).toHaveBeenCalledWith({ where: { id: 'loc-1' } });
    expect(auditLogMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'location.deleted' }));
  });
});
