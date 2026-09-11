import type { Event, EventStatus, EventTicketType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { recordAuditLog } from '@/server/services/audit-log-service';

/** Statuses that make an event visible on public catalog pages. */
export const PUBLICLY_VISIBLE_EVENT_STATUSES: EventStatus[] = [
  'COMING_SOON',
  'PUBLISHED',
  'ON_SALE',
  'SOLD_OUT',
  'CLOSED',
  'CANCELLED',
  'COMPLETED',
];

export interface Actor {
  actorId: string;
  ipAddress?: string | null;
}

export class EventNotFoundError extends Error {}

export class EventValidationError extends Error {
  missingFields: string[];
  constructor(message: string, missingFields: string[] = []) {
    super(message);
    this.missingFields = missingFields;
  }
}

const REQUIRED_PUBLISH_FIELDS: Array<keyof Event> = [
  'title',
  'slug',
  'shortDescription',
  'longDescription',
  'startAt',
  'endAt',
  'timezone',
  'locationId',
  'coverImageUrl',
];

export interface PublicEventFilters {
  keyword?: string;
  city?: string;
  state?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: EventStatus;
}

export async function listPublicEvents(filters: PublicEventFilters) {
  const where: Prisma.EventWhereInput = {
    status: filters.status ? filters.status : { in: PUBLICLY_VISIBLE_EVENT_STATUSES },
  };

  if (filters.city) where.city = filters.city;
  if (filters.state) where.state = filters.state;
  if (filters.dateFrom || filters.dateTo) {
    where.startAt = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    };
  }
  if (filters.keyword) {
    where.OR = [
      { title: { contains: filters.keyword, mode: 'insensitive' } },
      { shortDescription: { contains: filters.keyword, mode: 'insensitive' } },
      { seriesName: { contains: filters.keyword, mode: 'insensitive' } },
    ];
  }

  return prisma.event.findMany({
    where,
    include: { location: true, instructors: { include: { instructor: true } }, ticketTypes: true },
    orderBy: [{ sortOrder: 'asc' }, { startAt: 'asc' }],
  });
}

export async function getPublicEventBySlug(slug: string) {
  return prisma.event.findFirst({
    where: { slug, status: { in: PUBLICLY_VISIBLE_EVENT_STATUSES } },
    include: {
      location: true,
      instructors: { include: { instructor: true } },
      ticketTypes: { orderBy: { sortOrder: 'asc' } },
      faqOverrides: { orderBy: { sortOrder: 'asc' } },
    },
  });
}

export interface AdminEventFilters {
  status?: EventStatus;
  keyword?: string;
}

export async function listAdminEvents(filters: AdminEventFilters = {}) {
  const where: Prisma.EventWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.keyword) {
    where.OR = [
      { title: { contains: filters.keyword, mode: 'insensitive' } },
      { slug: { contains: filters.keyword, mode: 'insensitive' } },
    ];
  }
  return prisma.event.findMany({
    where,
    include: { location: true, ticketTypes: true },
    orderBy: [{ startAt: 'desc' }],
  });
}

export async function getAdminEventById(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      location: true,
      instructors: { include: { instructor: true } },
      ticketTypes: { orderBy: { sortOrder: 'asc' } },
      faqOverrides: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!event) throw new EventNotFoundError(`Event ${id} not found`);
  return event;
}

export type EventInput = Omit<
  Prisma.EventUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'status'
>;

export async function createEvent(input: EventInput, actor: Actor): Promise<Event> {
  const event = await prisma.event.create({ data: input });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'event.created',
    entityType: 'Event',
    entityId: event.id,
    ipAddress: actor.ipAddress,
  });
  return event;
}

export async function updateEvent(
  id: string,
  input: Partial<EventInput>,
  actor: Actor,
): Promise<Event> {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new EventNotFoundError(`Event ${id} not found`);
  const event = await prisma.event.update({ where: { id }, data: input });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'event.updated',
    entityType: 'Event',
    entityId: event.id,
    ipAddress: actor.ipAddress,
    metadata: { fields: Object.keys(input) },
  });
  return event;
}

async function requireEvent(id: string): Promise<Event> {
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) throw new EventNotFoundError(`Event ${id} not found`);
  return event;
}

async function transitionStatus(
  id: string,
  status: EventStatus,
  action: string,
  actor: Actor,
): Promise<Event> {
  await requireEvent(id);
  const event = await prisma.event.update({ where: { id }, data: { status } });
  await recordAuditLog({
    actorId: actor.actorId,
    action,
    entityType: 'Event',
    entityId: event.id,
    ipAddress: actor.ipAddress,
  });
  return event;
}

export async function publishEvent(id: string, actor: Actor): Promise<Event> {
  const event = await requireEvent(id);
  const missingFields = REQUIRED_PUBLISH_FIELDS.filter((field) => {
    const value = event[field];
    return value === null || value === undefined || value === '';
  });
  if (missingFields.length > 0) {
    throw new EventValidationError(
      `Cannot publish event: missing required fields: ${missingFields.join(', ')}`,
      missingFields,
    );
  }
  const published = await prisma.event.update({ where: { id }, data: { status: 'PUBLISHED' } });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'event.published',
    entityType: 'Event',
    entityId: published.id,
    ipAddress: actor.ipAddress,
  });
  return published;
}

export async function cancelEvent(id: string, actor: Actor): Promise<Event> {
  return transitionStatus(id, 'CANCELLED', 'event.cancelled', actor);
}

export async function completeEvent(id: string, actor: Actor): Promise<Event> {
  return transitionStatus(id, 'COMPLETED', 'event.completed', actor);
}

export async function closeSales(id: string, actor: Actor): Promise<Event> {
  return transitionStatus(id, 'CLOSED', 'event.closed', actor);
}

export async function deleteEvent(id: string, actor: Actor): Promise<void> {
  const event = await requireEvent(id);
  if (event.status !== 'DRAFT') {
    throw new EventValidationError('Only DRAFT events can be deleted');
  }
  await prisma.event.delete({ where: { id } });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'event.deleted',
    entityType: 'Event',
    entityId: id,
    ipAddress: actor.ipAddress,
  });
}

export type TicketTypeInput = Omit<
  Prisma.EventTicketTypeUncheckedCreateInput,
  'id' | 'eventId' | 'createdAt' | 'updatedAt'
>;

async function requireTicketType(eventId: string, ticketTypeId: string): Promise<EventTicketType> {
  const ticketType = await prisma.eventTicketType.findUnique({ where: { id: ticketTypeId } });
  if (!ticketType || ticketType.eventId !== eventId) {
    throw new EventNotFoundError(`Ticket type ${ticketTypeId} not found on event ${eventId}`);
  }
  return ticketType;
}

export async function createTicketType(
  eventId: string,
  input: TicketTypeInput,
  actor: Actor,
): Promise<EventTicketType> {
  await requireEvent(eventId);
  const ticketType = await prisma.eventTicketType.create({ data: { ...input, eventId } });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'event.ticket_type.created',
    entityType: 'EventTicketType',
    entityId: ticketType.id,
    ipAddress: actor.ipAddress,
    metadata: { eventId },
  });
  return ticketType;
}

export async function updateTicketType(
  eventId: string,
  ticketTypeId: string,
  input: Partial<TicketTypeInput>,
  actor: Actor,
): Promise<EventTicketType> {
  await requireTicketType(eventId, ticketTypeId);
  const ticketType = await prisma.eventTicketType.update({ where: { id: ticketTypeId }, data: input });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'event.ticket_type.updated',
    entityType: 'EventTicketType',
    entityId: ticketType.id,
    ipAddress: actor.ipAddress,
    metadata: { eventId, fields: Object.keys(input) },
  });
  return ticketType;
}

export async function deleteTicketType(eventId: string, ticketTypeId: string, actor: Actor): Promise<void> {
  await requireTicketType(eventId, ticketTypeId);
  await prisma.eventTicketType.delete({ where: { id: ticketTypeId } });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'event.ticket_type.deleted',
    entityType: 'EventTicketType',
    entityId: ticketTypeId,
    ipAddress: actor.ipAddress,
    metadata: { eventId },
  });
}
