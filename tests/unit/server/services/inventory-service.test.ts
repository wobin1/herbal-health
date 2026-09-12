import { describe, expect, it, vi } from 'vitest';
import {
  InsufficientInventoryError,
  reserveTicketCapacity,
  releaseTicketReservation,
  convertReservationToSale,
  releaseSoldCapacity,
} from '@/server/services/inventory-service';

function makeTx(ticketType: Record<string, unknown> | null) {
  return {
    eventTicketType: {
      findUnique: vi.fn().mockResolvedValue(ticketType),
      update: vi.fn().mockResolvedValue({}),
    },
  } as never;
}

describe('reserveTicketCapacity', () => {
  it('throws when the ticket type does not exist', async () => {
    const tx = makeTx(null);
    await expect(reserveTicketCapacity(tx, 'tt-1', 1)).rejects.toThrow(InsufficientInventoryError);
  });

  it('throws when requested quantity exceeds remaining capacity', async () => {
    const tx = makeTx({ id: 'tt-1', capacity: 10, reservedCount: 8, soldCount: 1 });
    await expect(reserveTicketCapacity(tx, 'tt-1', 5)).rejects.toThrow(InsufficientInventoryError);
    expect((tx as { eventTicketType: { update: ReturnType<typeof vi.fn> } }).eventTicketType.update).not.toHaveBeenCalled();
  });

  it('increments reservedCount when capacity is available', async () => {
    const tx = makeTx({ id: 'tt-1', capacity: 10, reservedCount: 2, soldCount: 1 });
    await reserveTicketCapacity(tx, 'tt-1', 3);
    expect((tx as { eventTicketType: { update: ReturnType<typeof vi.fn> } }).eventTicketType.update).toHaveBeenCalledWith({
      where: { id: 'tt-1' },
      data: { reservedCount: { increment: 3 } },
    });
  });

  it('allows reserving exactly the remaining capacity (boundary)', async () => {
    const tx = makeTx({ id: 'tt-1', capacity: 10, reservedCount: 5, soldCount: 3 });
    await expect(reserveTicketCapacity(tx, 'tt-1', 2)).resolves.toBeUndefined();
  });
});

describe('releaseTicketReservation', () => {
  it('decrements reservedCount', async () => {
    const tx = makeTx(null);
    await releaseTicketReservation(tx, 'tt-1', 2);
    expect((tx as { eventTicketType: { update: ReturnType<typeof vi.fn> } }).eventTicketType.update).toHaveBeenCalledWith({
      where: { id: 'tt-1' },
      data: { reservedCount: { decrement: 2 } },
    });
  });
});

describe('convertReservationToSale', () => {
  it('moves quantity from reserved to sold', async () => {
    const tx = makeTx(null);
    await convertReservationToSale(tx, 'tt-1', 2);
    expect((tx as { eventTicketType: { update: ReturnType<typeof vi.fn> } }).eventTicketType.update).toHaveBeenCalledWith({
      where: { id: 'tt-1' },
      data: { reservedCount: { decrement: 2 }, soldCount: { increment: 2 } },
    });
  });
});

describe('releaseSoldCapacity', () => {
  it('decrements soldCount, freeing capacity for resale on refund', async () => {
    const tx = makeTx(null);
    await releaseSoldCapacity(tx, 'tt-1', 2);
    expect((tx as { eventTicketType: { update: ReturnType<typeof vi.fn> } }).eventTicketType.update).toHaveBeenCalledWith({
      where: { id: 'tt-1' },
      data: { soldCount: { decrement: 2 } },
    });
  });
});
