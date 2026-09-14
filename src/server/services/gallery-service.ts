import type { GalleryImage, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { recordAuditLog } from '@/server/services/audit-log-service';
import { buildPageResult, toSkipTake, type PageParams } from '@/lib/pagination';

export class GalleryImageNotFoundError extends Error {}

export interface Actor {
  actorId: string;
  ipAddress?: string | null;
}

export async function listGalleryImages(pageParams: PageParams) {
  const { skip, take } = toSkipTake(pageParams);
  const [items, total] = await Promise.all([
    prisma.galleryImage.findMany({ orderBy: { sortOrder: 'asc' }, skip, take }),
    prisma.galleryImage.count(),
  ]);
  return buildPageResult(items, total, pageParams);
}

export async function listPublishedGalleryImages(): Promise<GalleryImage[]> {
  return prisma.galleryImage.findMany({
    where: { published: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getGalleryImageById(id: string) {
  const item = await prisma.galleryImage.findUnique({ where: { id } });
  if (!item) throw new GalleryImageNotFoundError(`GalleryImage ${id} not found`);
  return item;
}

export type GalleryImageInput = Omit<Prisma.GalleryImageUncheckedCreateInput, 'id' | 'createdAt' | 'updatedAt'>;

export async function createGalleryImage(input: GalleryImageInput, actor: Actor): Promise<GalleryImage> {
  const item = await prisma.galleryImage.create({ data: input });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'gallery.created',
    entityType: 'GalleryImage',
    entityId: item.id,
    ipAddress: actor.ipAddress,
  });
  return item;
}

export async function updateGalleryImage(
  id: string,
  input: Partial<GalleryImageInput>,
  actor: Actor,
): Promise<GalleryImage> {
  await getGalleryImageById(id);
  const item = await prisma.galleryImage.update({ where: { id }, data: input });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'gallery.updated',
    entityType: 'GalleryImage',
    entityId: item.id,
    ipAddress: actor.ipAddress,
    metadata: { fields: Object.keys(input) },
  });
  return item;
}

export async function deleteGalleryImage(id: string, actor: Actor): Promise<void> {
  await getGalleryImageById(id);
  await prisma.galleryImage.delete({ where: { id } });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'gallery.deleted',
    entityType: 'GalleryImage',
    entityId: id,
    ipAddress: actor.ipAddress,
  });
}
