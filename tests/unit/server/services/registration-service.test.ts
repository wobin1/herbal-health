import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  registration: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  attendee: { update: vi.fn() },
};

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));

const auditLogMock = vi.fn();
vi.mock('@/server/services/audit-log-service', () => ({ recordAuditLog: auditLogMock }));

const enqueueEmailMock = vi.fn();
vi.mock('@/server/services/email-queue-service', () => ({ enqueueEmail: enqueueEmailMock }));

const {
  createRegistrationWithUniqueReference,
  findRegistrationByReferenceAndEmail,
  RegistrationNotFoundError,
  resendRegistrationConfirmation,
  cancelRegistration,
  markAttendeeAttended,
  addAttendeeNote,
  transferRegistration,
  listAttendeesForExport,
} = await import('@/server/services/registration-service');

const REGISTRATION_WITH_RELATIONS = {
  id: 'reg-1',
  reference: 'HHS-2026-ABCDEF',
  status: 'CONFIRMED',
  eventId: 'evt-1',
  attendeeId: 'att-1',
  event: { title: 'Herbal Basics', startAt: new Date('2026-06-01T00:00:00Z'), city: 'Austin', state: 'TX' },
  attendee: { id: 'att-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createRegistrationWithUniqueReference', () => {
  it('creates a registration on the first attempt when the reference is unique', async () => {
    const tx = { registration: { create: vi.fn().mockResolvedValue({ id: 'reg-1', reference: 'HHS-2026-ABCDEF' }) } };
    const result = await createRegistrationWithUniqueReference(tx as never, {
      orderId: 'order-1',
      orderItemId: 'item-1',
      attendeeId: 'att-1',
      eventId: 'evt-1',
    });
    expect(result.reference).toMatch(/^HHS-\d{4}-/);
    expect(tx.registration.create).toHaveBeenCalledTimes(1);
  });

  it('retries on a unique-constraint collision (P2002) and eventually succeeds', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }))
      .mockResolvedValueOnce({ id: 'reg-1', reference: 'HHS-2026-ABCDEF' });
    const tx = { registration: { create } };
    const result = await createRegistrationWithUniqueReference(tx as never, {
      orderId: 'order-1',
      orderItemId: 'item-1',
      attendeeId: 'att-1',
      eventId: 'evt-1',
    });
    expect(create).toHaveBeenCalledTimes(2);
    expect(result.id).toBe('reg-1');
  });

  it('propagates non-collision errors immediately', async () => {
    const tx = { registration: { create: vi.fn().mockRejectedValue(new Error('db down')) } };
    await expect(
      createRegistrationWithUniqueReference(tx as never, {
        orderId: 'order-1',
        orderItemId: 'item-1',
        attendeeId: 'att-1',
        eventId: 'evt-1',
      }),
    ).rejects.toThrow('db down');
    expect(tx.registration.create).toHaveBeenCalledTimes(1);
  });
});

describe('findRegistrationByReferenceAndEmail', () => {
  it('requires both reference and email to match', async () => {
    prismaMock.registration.findFirst.mockResolvedValue(null);
    await findRegistrationByReferenceAndEmail('HHS-2026-ABCDEF', 'jane@example.com');
    expect(prismaMock.registration.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reference: 'HHS-2026-ABCDEF', attendee: { email: { equals: 'jane@example.com', mode: 'insensitive' } } },
      }),
    );
  });
});

describe('resendRegistrationConfirmation', () => {
  it('throws RegistrationNotFoundError when the registration does not exist', async () => {
    prismaMock.registration.findUnique.mockResolvedValue(null);
    await expect(resendRegistrationConfirmation('missing')).rejects.toThrow(RegistrationNotFoundError);
  });

  it('resends the confirmation email and records an audit log entry', async () => {
    prismaMock.registration.findUnique.mockResolvedValue(REGISTRATION_WITH_RELATIONS);
    await resendRegistrationConfirmation('reg-1', { actorId: 'admin-1' });
    expect(enqueueEmailMock).toHaveBeenCalledWith(
      prismaMock,
      expect.objectContaining({
        type: 'REGISTRATION_CONFIRMATION',
        toEmail: 'jane@example.com',
        variables: expect.objectContaining({ registrationReference: 'HHS-2026-ABCDEF' }),
      }),
    );
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin-1', action: 'registration.confirmationResent', entityId: 'reg-1' }),
    );
  });
});

describe('cancelRegistration', () => {
  it('throws RegistrationNotFoundError when the registration does not exist', async () => {
    prismaMock.registration.findUnique.mockResolvedValue(null);
    await expect(cancelRegistration('missing', { actorId: 'admin-1' })).rejects.toThrow(RegistrationNotFoundError);
  });

  it('sets status to CANCELLED, notifies the attendee, and audit-logs the action', async () => {
    prismaMock.registration.findUnique.mockResolvedValue(REGISTRATION_WITH_RELATIONS);
    prismaMock.registration.update.mockResolvedValue({ ...REGISTRATION_WITH_RELATIONS, status: 'CANCELLED' });
    await cancelRegistration('reg-1', { actorId: 'admin-1', ipAddress: '10.0.0.1' });
    expect(prismaMock.registration.update).toHaveBeenCalledWith({
      where: { id: 'reg-1' },
      data: { status: 'CANCELLED' },
    });
    expect(enqueueEmailMock).toHaveBeenCalledWith(
      prismaMock,
      expect.objectContaining({ type: 'REGISTRATION_CANCELLATION', toEmail: 'jane@example.com' }),
    );
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin-1', action: 'registration.cancelled', entityId: 'reg-1', ipAddress: '10.0.0.1' }),
    );
  });
});

describe('markAttendeeAttended', () => {
  it('throws RegistrationNotFoundError when the registration does not exist', async () => {
    prismaMock.registration.findUnique.mockResolvedValue(null);
    await expect(markAttendeeAttended('missing', { actorId: 'admin-1' })).rejects.toThrow(RegistrationNotFoundError);
  });

  it('stamps attendedAt on the attendee and audit-logs the action', async () => {
    prismaMock.registration.findUnique.mockResolvedValue(REGISTRATION_WITH_RELATIONS);
    await markAttendeeAttended('reg-1', { actorId: 'admin-1' });
    expect(prismaMock.attendee.update).toHaveBeenCalledWith({
      where: { id: 'att-1' },
      data: { attendedAt: expect.any(Date) },
    });
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin-1', action: 'registration.markedAttended', entityId: 'reg-1' }),
    );
  });
});

describe('addAttendeeNote', () => {
  it('sets internalNotes and audit-logs the action', async () => {
    await addAttendeeNote('att-1', 'Requested front-row seating', { actorId: 'admin-1' });
    expect(prismaMock.attendee.update).toHaveBeenCalledWith({
      where: { id: 'att-1' },
      data: { internalNotes: 'Requested front-row seating' },
    });
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin-1', action: 'attendee.noteAdded', entityId: 'att-1' }),
    );
  });
});

describe('transferRegistration', () => {
  it('throws RegistrationNotFoundError when the registration does not exist', async () => {
    prismaMock.registration.findUnique.mockResolvedValue(null);
    await expect(
      transferRegistration('missing', { firstName: 'A', lastName: 'B', email: 'a@b.com', phone: '1', country: 'US' }, {
        actorId: 'admin-1',
      }),
    ).rejects.toThrow(RegistrationNotFoundError);
  });

  it('updates the attendee record and audit-logs the transfer', async () => {
    prismaMock.registration.findUnique.mockResolvedValue(REGISTRATION_WITH_RELATIONS);
    const newAttendee = { firstName: 'Alex', lastName: 'Smith', email: 'alex@example.com', phone: '555-0199', country: 'US' };
    await transferRegistration('reg-1', newAttendee, { actorId: 'admin-1' });
    expect(prismaMock.attendee.update).toHaveBeenCalledWith({ where: { id: 'att-1' }, data: newAttendee });
    expect(enqueueEmailMock).toHaveBeenCalledWith(
      prismaMock,
      expect.objectContaining({ type: 'REGISTRATION_TRANSFER', toEmail: 'alex@example.com' }),
    );
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'admin-1', action: 'registration.transferred', entityId: 'reg-1' }),
    );
  });
});

describe('listAttendeesForExport', () => {
  it('filters by eventId when provided', async () => {
    prismaMock.registration.findMany.mockResolvedValue([]);
    await listAttendeesForExport({ eventId: 'evt-1' });
    expect(prismaMock.registration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { eventId: 'evt-1' } }),
    );
  });

  it('returns all registrations when no filter is given', async () => {
    prismaMock.registration.findMany.mockResolvedValue([]);
    await listAttendeesForExport({});
    expect(prismaMock.registration.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });
});
