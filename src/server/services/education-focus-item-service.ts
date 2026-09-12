import type { EducationalFocusItem, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { recordAuditLog } from '@/server/services/audit-log-service';
import { buildPageResult, toSkipTake, type PageParams } from '@/lib/pagination';

export class EducationFocusItemNotFoundError extends Error {}

export interface Actor {
  actorId: string;
  ipAddress?: string | null;
}

export async function listEducationFocusItems(pageParams: PageParams) {
  const { skip, take } = toSkipTake(pageParams);
  const [items, total] = await Promise.all([
    prisma.educationalFocusItem.findMany({ orderBy: { sortOrder: 'asc' }, skip, take }),
    prisma.educationalFocusItem.count(),
  ]);
  return buildPageResult(items, total, pageParams);
}

export async function getEducationFocusItemById(id: string) {
  const item = await prisma.educationalFocusItem.findUnique({ where: { id } });
  if (!item) throw new EducationFocusItemNotFoundError(`EducationalFocusItem ${id} not found`);
  return item;
}

export type EducationFocusItemInput = Omit<
  Prisma.EducationalFocusItemUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt'
>;

export async function createEducationFocusItem(
  input: EducationFocusItemInput,
  actor: Actor,
): Promise<EducationalFocusItem> {
  const item = await prisma.educationalFocusItem.create({ data: input });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'educationFocusItem.created',
    entityType: 'EducationalFocusItem',
    entityId: item.id,
    ipAddress: actor.ipAddress,
  });
  return item;
}

export async function updateEducationFocusItem(
  id: string,
  input: Partial<EducationFocusItemInput>,
  actor: Actor,
): Promise<EducationalFocusItem> {
  await getEducationFocusItemById(id);
  const item = await prisma.educationalFocusItem.update({ where: { id }, data: input });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'educationFocusItem.updated',
    entityType: 'EducationalFocusItem',
    entityId: item.id,
    ipAddress: actor.ipAddress,
    metadata: { fields: Object.keys(input) },
  });
  return item;
}

export async function deleteEducationFocusItem(id: string, actor: Actor): Promise<void> {
  await getEducationFocusItemById(id);
  await prisma.educationalFocusItem.delete({ where: { id } });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'educationFocusItem.deleted',
    entityType: 'EducationalFocusItem',
    entityId: id,
    ipAddress: actor.ipAddress,
  });
}
