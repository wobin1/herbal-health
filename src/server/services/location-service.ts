import type { Location, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { recordAuditLog } from '@/server/services/audit-log-service';
import { buildPageResult, toSkipTake, type PageParams } from '@/lib/pagination';

export class LocationNotFoundError extends Error {}

export interface Actor {
  actorId: string;
  ipAddress?: string | null;
}

export async function listAllLocations() {
  return prisma.location.findMany({ orderBy: { name: 'asc' } });
}

export async function listLocations(pageParams: PageParams) {
  const { skip, take } = toSkipTake(pageParams);
  const [locations, total] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' }, skip, take }),
    prisma.location.count(),
  ]);
  return buildPageResult(locations, total, pageParams);
}

export async function getLocationById(id: string) {
  const location = await prisma.location.findUnique({ where: { id } });
  if (!location) throw new LocationNotFoundError(`Location ${id} not found`);
  return location;
}

export type LocationInput = Omit<Prisma.LocationUncheckedCreateInput, 'id' | 'createdAt' | 'updatedAt'>;

export async function createLocation(input: LocationInput, actor: Actor): Promise<Location> {
  const location = await prisma.location.create({ data: input });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'location.created',
    entityType: 'Location',
    entityId: location.id,
    ipAddress: actor.ipAddress,
  });
  return location;
}

export async function updateLocation(
  id: string,
  input: Partial<LocationInput>,
  actor: Actor,
): Promise<Location> {
  await getLocationById(id);
  const location = await prisma.location.update({ where: { id }, data: input });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'location.updated',
    entityType: 'Location',
    entityId: location.id,
    ipAddress: actor.ipAddress,
    metadata: { fields: Object.keys(input) },
  });
  return location;
}

export async function deleteLocation(id: string, actor: Actor): Promise<void> {
  await getLocationById(id);
  await prisma.location.delete({ where: { id } });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'location.deleted',
    entityType: 'Location',
    entityId: id,
    ipAddress: actor.ipAddress,
  });
}
