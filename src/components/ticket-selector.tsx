'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { getAvailabilityLabel, getMaxQuantity } from '@/lib/events/availability';

export interface TicketSelectorOption {
  id: string;
  name: string;
  priceMinorUnits: number;
  currency: string;
  seatsRemaining: number;
}

interface TicketSelectorProps {
  eventId: string;
  tickets: TicketSelectorOption[];
}

function formatPrice(priceMinorUnits: number, currency: string): string {
  return (priceMinorUnits / 100).toLocaleString('en-US', { style: 'currency', currency });
}

interface QuantityFieldProps {
  id: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}

function QuantityField({ id, value, max, onChange }: QuantityFieldProps) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        Number of tickets
      </label>
      <input
        id={id}
        type="number"
        min={1}
        max={max}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(1, Math.trunc(next))));
        }}
        className="focus:border-primary-950 focus:ring-primary-950/30 w-20 rounded-md border border-neutral-300 px-3 py-1.5 focus:ring-2 focus:outline-none"
      />
    </div>
  );
}

export function TicketSelector({ eventId, tickets }: TicketSelectorProps) {
  const router = useRouter();
  const groupName = useId();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    tickets.length === 1 ? tickets[0].id : null,
  );

  const quantityId = useId();
  const [requestedQuantity, setRequestedQuantity] = useState(1);

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? null;
  const maxQuantity = selectedTicket ? getMaxQuantity(selectedTicket.seatsRemaining) : 0;
  const quantity = Math.max(1, Math.min(requestedQuantity, maxQuantity));

  function goToCheckout(ticketTypeId: string) {
    router.push(
      `/checkout?eventId=${eventId}&ticketTypeId=${ticketTypeId}&quantity=${quantity}&max=${maxQuantity}`,
    );
  }

  if (tickets.length === 1) {
    const ticket = tickets[0];
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <span>
            {ticket.name} — {formatPrice(ticket.priceMinorUnits, ticket.currency)}
            <span className="ml-2 text-sm font-medium text-neutral-600">
              {getAvailabilityLabel(ticket.seatsRemaining)}
            </span>
          </span>
          {ticket.seatsRemaining > 0 ? (
            <button
              type="button"
              onClick={() => goToCheckout(ticket.id)}
              className="bg-primary-950 duration-fast ease-premium hover:bg-primary-900 inline-block rounded-full px-4 py-2 text-sm font-medium text-neutral-50 transition-colors"
            >
              Buy Ticket
            </button>
          ) : null}
        </div>
        {ticket.seatsRemaining > 0 ? (
          <QuantityField
            id={quantityId}
            value={quantity}
            max={maxQuantity}
            onChange={setRequestedQuantity}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="sr-only">Choose a ticket type</legend>
        {tickets.map((ticket) => (
          <label
            key={ticket.id}
            htmlFor={`${groupName}-${ticket.id}`}
            className={`has-[:checked]:border-primary-950 flex items-center justify-between gap-4 rounded-md border border-neutral-200 px-4 py-2 ${
              ticket.seatsRemaining === 0 ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                id={`${groupName}-${ticket.id}`}
                name={groupName}
                value={ticket.id}
                checked={selectedTicketId === ticket.id}
                disabled={ticket.seatsRemaining === 0}
                onChange={() => setSelectedTicketId(ticket.id)}
                className="text-primary-950 focus:ring-primary-950/30 h-4 w-4 border-neutral-300 focus:ring-2"
              />
              {ticket.name}
            </span>
            <span className="text-right">
              {formatPrice(ticket.priceMinorUnits, ticket.currency)}
              <span className="block text-sm font-medium text-neutral-600">
                {getAvailabilityLabel(ticket.seatsRemaining)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {selectedTicket && maxQuantity > 0 ? (
        <QuantityField
          id={quantityId}
          value={quantity}
          max={maxQuantity}
          onChange={setRequestedQuantity}
        />
      ) : null}
      {selectedTicket && maxQuantity > 0 ? (
        <button
          type="button"
          onClick={() => goToCheckout(selectedTicket.id)}
          className="bg-primary-950 duration-fast ease-premium hover:bg-primary-900 inline-block rounded-full px-4 py-2 text-sm font-medium text-neutral-50 transition-colors"
        >
          Buy Tickets
        </button>
      ) : null}
    </div>
  );
}
