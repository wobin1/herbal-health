import type { Event, EventStatus, EventTicketType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { recordAuditLog } from '@/server/services/audit-log-service';
import { enqueueEmail } from '@/server/services/email-queue-service';
import { randomUUID } from 'node:crypto';
import { isTicketPurchasable } from '@/lib/events/availability';
import { buildPageResult, toSkipTake, type PageParams } from '@/lib/pagination';

/** Fields that, if changed, warrant notifying already-registered attendees. */
const NOTIFY_ON_CHANGE_FIELDS: Array<keyof Event> = ['startAt', 'endAt', 'locationId', 'city', 'state'];

async function notifyRegisteredAttendees(
  event: Event,
  type: 'EVENT_UPDATE' | 'EVENT_CANCELLATION',
  dedupeKeyPrefix: string,
): Promise<void> {
  const registrations = await prisma.registration.findMany({
    where: { eventId: event.id, status: 'CONFIRMED' },
    include: { attendee: true },
  });
  for (const registration of registrations) {
    await enqueueEmail(prisma, {
      type,
      toEmail: registration.attendee.email,
      dedupeKey: `${dedupeKeyPrefix}:${registration.id}`,
      variables: {
        attendeeFirstName: registration.attendee.firstName,
        registrationReference: registration.reference,
        eventTitle: event.title,
        eventStartAt: event.startAt.toISOString(),
        eventLocation: `${event.city}, ${event.state}`,
      },
    });
  }
}

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

export async function listPublicEvents(filters: PublicEventFilters, pageParams: PageParams) {
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

  const { skip, take } = toSkipTake(pageParams);
  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: { location: true, instructors: { include: { instructor: true } }, ticketTypes: true },
      orderBy: [{ sortOrder: 'asc' }, { startAt: 'asc' }],
      skip,
      take,
    }),
    prisma.event.count({ where }),
  ]);
  return buildPageResult(events, total, pageParams);
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

/** Upcoming on-sale events in the same city that still have a purchasable ticket type. */
export async function listAlternativeEvents(
  event: Pick<Event, 'id' | 'city' | 'state'>,
  now: Date = new Date(),
) {
  const events = await prisma.event.findMany({
    where: {
      id: { not: event.id },
      city: event.city,
      state: event.state,
      status: 'ON_SALE',
      startAt: { gte: now },
    },
    include: { location: true, ticketTypes: true },
    orderBy: { startAt: 'asc' },
    take: 6,
  });
  return events.filter((candidate) =>
    candidate.ticketTypes.some((ticket) => isTicketPurchasable(ticket, now)),
  );
}

export interface AdminEventFilters {
  status?: EventStatus;
  keyword?: string;
}

export async function listAdminEvents(filters: AdminEventFilters = {}, pageParams: PageParams) {
  const where: Prisma.EventWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.keyword) {
    where.OR = [
      { title: { contains: filters.keyword, mode: 'insensitive' } },
      { slug: { contains: filters.keyword, mode: 'insensitive' } },
    ];
  }
  const { skip, take } = toSkipTake(pageParams);
  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: { location: true, ticketTypes: true },
      orderBy: [{ startAt: 'desc' }],
      skip,
      take,
    }),
    prisma.event.count({ where }),
  ]);
  return buildPageResult(events, total, pageParams);
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

  const scheduleOrLocationChanged = NOTIFY_ON_CHANGE_FIELDS.some((field) => {
    if (!(field in input)) return false;
    const before = existing[field];
    const after = event[field];
    if (before instanceof Date && after instanceof Date) return before.getTime() !== after.getTime();
    return before !== after;
  });
  if (scheduleOrLocationChanged) {
    await notifyRegisteredAttendees(event, 'EVENT_UPDATE', `event-updated:${randomUUID()}`);
  }

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

export async function startSales(id: string, actor: Actor): Promise<Event> {
  const event = await requireEvent(id);
  if (event.status !== 'PUBLISHED') {
    throw new EventValidationError('Only a PUBLISHED event can start sales');
  }
  return transitionStatus(id, 'ON_SALE', 'event.sales_started', actor);
}

export async function cancelEvent(id: string, actor: Actor): Promise<Event> {
  const existing = await requireEvent(id);
  if (existing.status === 'CANCELLED' || existing.status === 'COMPLETED') {
    throw new EventValidationError(`Cannot cancel an event that is already ${existing.status}`);
  }
  const event = await transitionStatus(id, 'CANCELLED', 'event.cancelled', actor);
  await notifyRegisteredAttendees(event, 'EVENT_CANCELLATION', 'event-cancelled');
  return event;
}

export async function completeEvent(id: string, actor: Actor): Promise<Event> {
  const existing = await requireEvent(id);
  if (existing.status !== 'ON_SALE' && existing.status !== 'CLOSED') {
    throw new EventValidationError('Only an event that is ON_SALE or CLOSED can be marked complete');
  }
  return transitionStatus(id, 'COMPLETED', 'event.completed', actor);
}

export async function closeSales(id: string, actor: Actor): Promise<Event> {
  const existing = await requireEvent(id);
  if (existing.status !== 'ON_SALE') {
    throw new EventValidationError('Only an ON_SALE event can have sales closed');
  }
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
