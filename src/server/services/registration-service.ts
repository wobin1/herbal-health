import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { generateRegistrationReference } from '@/lib/registration/reference';
import { recordAuditLog } from '@/server/services/audit-log-service';
import { enqueueEmail } from '@/server/services/email-queue-service';
import { randomUUID } from 'node:crypto';

type Tx = Pick<PrismaClient, 'registration'>;

export class RegistrationNotFoundError extends Error {}

export interface RegistrationActor {
  actorId: string;
  ipAddress?: string | null;
}

const MAX_ATTEMPTS = 5;

/**
 * Generates and persists a unique registration for an attendee, retrying on
 * the rare reference collision (enforced by the DB unique constraint on
 * Registration.reference).
 */
export async function createRegistrationWithUniqueReference(
  tx: Tx,
  data: { orderId: string; orderItemId: string; attendeeId: string; eventId: string },
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const reference = generateRegistrationReference();
    try {
      return await tx.registration.create({
        data: {
          reference,
          orderId: data.orderId,
          orderItemId: data.orderItemId,
          attendeeId: data.attendeeId,
          eventId: data.eventId,
          status: 'CONFIRMED',
        },
      });
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code === 'P2002') {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to generate a unique registration reference');
}

/**
 * Public registration lookup: requires both the reference and the
 * attendee's email so a guessed/enumerated reference alone can't disclose
 * another attendee's registration.
 */
export async function findRegistrationByReferenceAndEmail(reference: string, email: string) {
  return prisma.registration.findFirst({
    where: { reference, attendee: { email: { equals: email, mode: 'insensitive' } } },
    include: { attendee: true, event: true, orderItem: true },
  });
}

function eventVariables(event: { title: string; startAt: Date; city: string; state: string }) {
  return {
    eventTitle: event.title,
    eventStartAt: event.startAt.toISOString(),
    eventLocation: `${event.city}, ${event.state}`,
  };
}

async function findRegistrationWithRelationsOrThrow(registrationId: string) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { attendee: true, event: true },
  });
  if (!registration) {
    throw new RegistrationNotFoundError(`Registration ${registrationId} not found`);
  }
  return registration;
}

/** Admin action: resend the confirmation email for an existing registration. */
export async function resendRegistrationConfirmation(
  registrationId: string,
  actor?: RegistrationActor,
): Promise<void> {
  const registration = await findRegistrationWithRelationsOrThrow(registrationId);
  await enqueueEmail(prisma, {
    type: 'REGISTRATION_CONFIRMATION',
    toEmail: registration.attendee.email,
    dedupeKey: `registration-confirmation-resend:${registration.id}:${randomUUID()}`,
    variables: {
      attendeeFirstName: registration.attendee.firstName,
      registrationReference: registration.reference,
      ...eventVariables(registration.event),
    },
  });
  await recordAuditLog({
    actorId: actor?.actorId,
    action: 'registration.confirmationResent',
    entityType: 'Registration',
    entityId: registration.id,
    ipAddress: actor?.ipAddress,
  });
}

/** Admin action: cancel a registration without processing a refund. */
export async function cancelRegistration(registrationId: string, actor: RegistrationActor) {
  const registration = await findRegistrationWithRelationsOrThrow(registrationId);
  const updated = await prisma.registration.update({
    where: { id: registrationId },
    data: { status: 'CANCELLED' },
  });
  await enqueueEmail(prisma, {
    type: 'REGISTRATION_CANCELLATION',
    toEmail: registration.attendee.email,
    dedupeKey: `registration-cancelled:${registration.id}`,
    variables: {
      attendeeFirstName: registration.attendee.firstName,
      registrationReference: registration.reference,
      ...eventVariables(registration.event),
    },
  });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'registration.cancelled',
    entityType: 'Registration',
    entityId: registration.id,
    ipAddress: actor.ipAddress,
  });
  return updated;
}

/** Admin action: mark an attendee as having attended the event. */
export async function markAttendeeAttended(registrationId: string, actor: RegistrationActor) {
  const registration = await findRegistrationWithRelationsOrThrow(registrationId);
  await prisma.attendee.update({
    where: { id: registration.attendeeId },
    data: { attendedAt: new Date() },
  });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'registration.markedAttended',
    entityType: 'Registration',
    entityId: registration.id,
    ipAddress: actor.ipAddress,
  });
}

/** Admin action: set an internal (staff-only) note on an attendee. Not a health/medical field. */
export async function addAttendeeNote(attendeeId: string, note: string, actor: RegistrationActor) {
  await prisma.attendee.update({
    where: { id: attendeeId },
    data: { internalNotes: note },
  });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'attendee.noteAdded',
    entityType: 'Attendee',
    entityId: attendeeId,
    ipAddress: actor.ipAddress,
  });
}

export interface TransferAttendeeDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
}

/** Admin action: transfer a registration's ticket to a different attendee. */
export async function transferRegistration(
  registrationId: string,
  newAttendee: TransferAttendeeDetails,
  actor: RegistrationActor,
) {
  const registration = await findRegistrationWithRelationsOrThrow(registrationId);
  await prisma.attendee.update({
    where: { id: registration.attendeeId },
    data: newAttendee,
  });
  await enqueueEmail(prisma, {
    type: 'REGISTRATION_TRANSFER',
    toEmail: newAttendee.email,
    dedupeKey: `registration-transfer:${registration.id}:${randomUUID()}`,
    variables: {
      attendeeFirstName: newAttendee.firstName,
      newAttendeeName: `${newAttendee.firstName} ${newAttendee.lastName}`,
      registrationReference: registration.reference,
      ...eventVariables(registration.event),
    },
  });
  await recordAuditLog({
    actorId: actor.actorId,
    action: 'registration.transferred',
    entityType: 'Registration',
    entityId: registration.id,
    ipAddress: actor.ipAddress,
  });
}

export interface AttendeeExportFilters {
  eventId?: string;
}

/** Permission-gated (attendees:export) at the API route layer. */
export async function listAttendeesForExport(filters: AttendeeExportFilters) {
  const where: { eventId?: string } = {};
  if (filters.eventId) where.eventId = filters.eventId;

  return prisma.registration.findMany({
    where,
    include: { attendee: true, event: true },
    orderBy: { createdAt: 'desc' },
  });
}
