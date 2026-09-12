import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db/client';

export interface RecordAuditLogInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
}

type Tx = Pick<PrismaClient, 'auditLog'> | Prisma.TransactionClient;

/**
 * Writes an audit log entry. When called from inside an open interactive
 * transaction, pass that `tx` — using the global `prisma` client there would
 * open a second pooled connection while the first is still held, which
 * under concurrency starves the pool and can blow past the transaction's
 * own timeout.
 */
export async function recordAuditLog(input: RecordAuditLogInput, tx: Tx = prisma): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      ipAddress: input.ipAddress ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
    },
  });
}
