import type { EmailType, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { getEmailProvider } from '@/lib/email/provider';
import { buildTicketsPdf } from '@/lib/tickets/pdf';
import { getRegistrationTicket } from '@/server/services/order-service';
import { renderEmailTemplate, type EmailVariables } from '@/lib/email/templates';

type EnqueueTx = Pick<PrismaClient, 'emailMessage'>;

export interface EnqueueEmailInput {
  type: EmailType;
  toEmail: string;
  /**
   * Idempotency key. A duplicate enqueue with the same key (a retried
   * webhook, a reminder job that already ran) is a silent no-op — the
   * unique constraint on EmailMessage.dedupeKey enforces this.
   */
  dedupeKey: string;
  variables: EmailVariables;
}

/**
 * Writes an email to the outbox instead of sending it inline. This is what
 * lets the caller's payment/refund/registration transaction commit even if
 * email delivery is slow or down — a separate job (processPendingEmails)
 * drains the queue afterward.
 */
export async function enqueueEmail(tx: EnqueueTx, input: EnqueueEmailInput): Promise<void> {
  try {
    await tx.emailMessage.create({
      data: {
        type: input.type,
        toEmail: input.toEmail,
        dedupeKey: input.dedupeKey,
        variables: input.variables as never,
      },
    });
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === 'P2002') {
      return;
    }
    throw error;
  }
}

const MAX_ATTEMPTS = 5;

export interface ProcessPendingEmailsResult {
  sent: number;
  failed: number;
}

/**
 * Drains PENDING outbox rows, sending each via the configured provider.
 * A row that fails stays PENDING (for the next run to retry) until it hits
 * MAX_ATTEMPTS, at which point it's marked FAILED (terminal) rather than
 * retried forever.
 */
export async function processPendingEmails(limit = 50): Promise<ProcessPendingEmailsResult> {
  const provider = getEmailProvider();
  const messages = await prisma.emailMessage.findMany({
    where: { status: 'PENDING', attempts: { lt: MAX_ATTEMPTS } },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  let sent = 0;
  let failed = 0;

  for (const message of messages) {
    const attempts = message.attempts + 1;
    try {
      const rendered = renderEmailTemplate(message.type, message.variables as unknown as EmailVariables);
      const variables = message.variables as unknown as EmailVariables;
      const attachments: Array<{ filename: string; content: Buffer }> = [];
      if (message.type === 'REGISTRATION_CONFIRMATION' && variables.registrationReference) {
        const found = await getRegistrationTicket(variables.registrationReference);
        if (found) {
          const pdf = await buildTicketsPdf(found.event, [found.ticket]);
          attachments.push({ filename: `ticket-${found.ticket.reference}.pdf`, content: Buffer.from(pdf) });
        }
      }
      await provider.send({
        toEmail: message.toEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        attachments,
      });
      await prisma.emailMessage.update({
        where: { id: message.id },
        data: { status: 'SENT', sentAt: new Date(), attempts, lastError: null },
      });
      sent += 1;
    } catch (error) {
      const lastError = error instanceof Error ? error.message : String(error);
      console.error(`[email-queue] ${message.type} to ${message.toEmail} failed:`, lastError);
      await prisma.emailMessage.update({
        where: { id: message.id },
        data: { status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING', attempts, lastError },
      });
      failed += 1;
    }
  }

  return { sent, failed };
}
