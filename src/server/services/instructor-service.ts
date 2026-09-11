import type { Instructor, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { recordAuditLog } from '@/server/services/audit-log-service';

export class InstructorNotFoundError extends Error {}

export interface Actor {
  actorId: string;
  ipAddress?: string | null;
}

export async function listInstructors() {
  return prisma.instructor.findMany({ orderBy: { sortOrder: 'asc' } });
}

export async function getInstructorById(id: string) {
  const instructor = await prisma.instructor.findUnique({ where: { id } });
  if (!instructor) throw new InstructorNotFoundError(`Instructor ${id} not found`);
  return instructor;
}

export type InstructorInput = Omit<
  Prisma.InstructorUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt'
>;

export async function createInstructor(input: InstructorInput, actor: Actor): Promise<Instructor> {
  const instructor = await prisma.instructor.create({ data: input });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'instructor.created',
    entityType: 'Instructor',
    entityId: instructor.id,
    ipAddress: actor.ipAddress,
  });
  return instructor;
}

export async function updateInstructor(
  id: string,
  input: Partial<InstructorInput>,
  actor: Actor,
): Promise<Instructor> {
  await getInstructorById(id);
  const instructor = await prisma.instructor.update({ where: { id }, data: input });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'instructor.updated',
    entityType: 'Instructor',
    entityId: instructor.id,
    ipAddress: actor.ipAddress,
    metadata: { fields: Object.keys(input) },
  });
  return instructor;
}

export async function deleteInstructor(id: string, actor: Actor): Promise<void> {
  await getInstructorById(id);
  await prisma.instructor.delete({ where: { id } });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'instructor.deleted',
    entityType: 'Instructor',
    entityId: id,
    ipAddress: actor.ipAddress,
  });
}
