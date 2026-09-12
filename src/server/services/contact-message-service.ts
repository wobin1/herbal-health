import type { ContactMessage } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { getEmailProvider } from '@/lib/email/provider';
import { recordAuditLog } from '@/server/services/audit-log-service';
import { buildPageResult, toSkipTake, type PageParams, type PageResult } from '@/lib/pagination';

export class ContactMessageNotFoundError extends Error {}

export interface Actor {
  actorId: string;
  ipAddress?: string | null;
}

export interface ContactMessageInput {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export interface ContactMessageContext {
  ipAddress?: string | null;
}

const DEFAULT_CONTACT_INBOX = 'hello@herbalhealthseminars.com';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function notifyInbox(input: ContactMessageInput): Promise<void> {
  const toEmail = process.env.CONTACT_INBOX_EMAIL ?? DEFAULT_CONTACT_INBOX;
  const phoneLine = input.phone ? `Phone: ${input.phone}\n` : '';
  const phoneHtml = input.phone ? `<p>Phone: ${escapeHtml(input.phone)}</p>` : '';

  await getEmailProvider().send({
    toEmail,
    subject: `New contact message from ${input.name}`,
    text: `From: ${input.name} <${input.email}>\n${phoneLine}\n${input.message}`,
    html: `<p>From: ${escapeHtml(input.name)} &lt;${escapeHtml(input.email)}&gt;</p>${phoneHtml}<p>${escapeHtml(
      input.message,
    ).replace(/\n/g, '<br>')}</p>`,
  });
}

export async function sendContactMessage(
  input: ContactMessageInput,
  context: ContactMessageContext = {},
): Promise<ContactMessage> {
  const record = await prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      message: input.message,
      ipAddress: context.ipAddress ?? null,
    },
  });

  try {
    await notifyInbox(input);
  } catch (error) {
    console.error('Failed to send contact message notification email', error);
  }

  return record;
}

export async function listContactMessages(
  pageParams: PageParams,
): Promise<PageResult<ContactMessage> & { unreadCount: number }> {
  const { skip, take } = toSkipTake(pageParams);
  const [messages, total, unreadCount] = await Promise.all([
    prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.contactMessage.count(),
    prisma.contactMessage.count({ where: { isRead: false } }),
  ]);
  return { ...buildPageResult(messages, total, pageParams), unreadCount };
}

async function getContactMessageById(id: string): Promise<ContactMessage> {
  const message = await prisma.contactMessage.findUnique({ where: { id } });
  if (!message) throw new ContactMessageNotFoundError(`ContactMessage ${id} not found`);
  return message;
}

export async function markContactMessageRead(id: string, actor: Actor): Promise<ContactMessage> {
  await getContactMessageById(id);
  const message = await prisma.contactMessage.update({ where: { id }, data: { isRead: true } });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'contactMessage.read',
    entityType: 'ContactMessage',
    entityId: id,
    ipAddress: actor.ipAddress,
  });
  return message;
}

export async function deleteContactMessage(id: string, actor: Actor): Promise<void> {
  await getContactMessageById(id);
  await prisma.contactMessage.delete({ where: { id } });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'contactMessage.deleted',
    entityType: 'ContactMessage',
    entityId: id,
    ipAddress: actor.ipAddress,
  });
}
