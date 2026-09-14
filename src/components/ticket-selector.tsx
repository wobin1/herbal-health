'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

export interface TicketSelectorOption {
  id: string;
  name: string;
  priceMinorUnits: number;
  currency: string;
}

interface TicketSelectorProps {
  eventId: string;
  tickets: TicketSelectorOption[];
}

function formatPrice(priceMinorUnits: number, currency: string): string {
  return (priceMinorUnits / 100).toLocaleString('en-US', { style: 'currency', currency });
}

export function TicketSelector({ eventId, tickets }: TicketSelectorProps) {
  const router = useRouter();
  const groupName = useId();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    tickets.length === 1 ? tickets[0].id : null,
  );

  function goToCheckout(ticketTypeId: string) {
    router.push(`/checkout?eventId=${eventId}&ticketTypeId=${ticketTypeId}`);
  }

  if (tickets.length === 1) {
    const ticket = tickets[0];
    return (
      <div className="flex items-center justify-between gap-4">
        <span>
          {ticket.name} — {formatPrice(ticket.priceMinorUnits, ticket.currency)}
        </span>
        <button
          type="button"
          onClick={() => goToCheckout(ticket.id)}
          className="inline-block rounded-full bg-primary-950 px-4 py-2 text-sm font-medium text-neutral-50 transition-colors duration-fast ease-premium hover:bg-primary-900"
        >
          Buy Ticket
        </button>
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
            className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-neutral-200 px-4 py-2 has-[:checked]:border-primary-950"
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                id={`${groupName}-${ticket.id}`}
                name={groupName}
                value={ticket.id}
                checked={selectedTicketId === ticket.id}
                onChange={() => setSelectedTicketId(ticket.id)}
                className="h-4 w-4 border-neutral-300 text-primary-950 focus:ring-2 focus:ring-primary-950/30"
              />
              {ticket.name}
            </span>
            <span>{formatPrice(ticket.priceMinorUnits, ticket.currency)}</span>
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        disabled={!selectedTicketId}
        onClick={() => selectedTicketId && goToCheckout(selectedTicketId)}
        className="inline-block rounded-full bg-primary-950 px-4 py-2 text-sm font-medium text-neutral-50 transition-colors duration-fast ease-premium hover:bg-primary-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Buy Tickets
      </button>
    </div>
  );
}
