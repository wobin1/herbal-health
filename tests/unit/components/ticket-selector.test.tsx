import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TicketSelector } from '@/components/ticket-selector';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const GA = { id: 'tt-ga', name: 'General Admission', priceMinorUnits: 2500, currency: 'USD' };
const VIP = { id: 'tt-vip', name: 'VIP', priceMinorUnits: 5000, currency: 'USD' };

describe('TicketSelector', () => {
  it('shows a single "Buy Ticket" button with no selection step when there is only one ticket type', async () => {
    render(<TicketSelector eventId="evt-1" tickets={[GA]} />);

    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Buy Ticket' });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(push).toHaveBeenCalledWith('/checkout?eventId=evt-1&ticketTypeId=tt-ga');
  });

  it('disables "Buy Tickets" until a ticket type is selected when there are multiple types', async () => {
    render(<TicketSelector eventId="evt-1" tickets={[GA, VIP]} />);

    const button = screen.getByRole('button', { name: 'Buy Tickets' });
    expect(button).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: /VIP/ }));
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(push).toHaveBeenCalledWith('/checkout?eventId=evt-1&ticketTypeId=tt-vip');
  });
});
