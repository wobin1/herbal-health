import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TicketSelector } from '@/components/ticket-selector';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const GA = {
  id: 'tt-ga',
  name: 'General Admission',
  priceMinorUnits: 2500,
  currency: 'USD',
  seatsRemaining: 40,
};
const VIP = {
  id: 'tt-vip',
  name: 'VIP',
  priceMinorUnits: 5000,
  currency: 'USD',
  seatsRemaining: 1,
};

describe('TicketSelector', () => {
  it('shows a single "Buy Ticket" button with no selection step when there is only one ticket type', async () => {
    render(<TicketSelector eventId="evt-1" tickets={[GA]} />);

    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Buy Ticket' });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(push).toHaveBeenCalledWith(
      '/checkout?eventId=evt-1&ticketTypeId=tt-ga&quantity=1&max=10',
    );
  });

  it('shows no buy button until a ticket type is selected when there are multiple types', async () => {
    render(<TicketSelector eventId="evt-1" tickets={[GA, VIP]} />);

    expect(screen.queryByRole('button', { name: 'Buy Tickets' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /VIP/ }));
    const button = screen.getByRole('button', { name: 'Buy Tickets' });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(push).toHaveBeenCalledWith(
      '/checkout?eventId=evt-1&ticketTypeId=tt-vip&quantity=1&max=1',
    );
  });

  it('shows seats left for each ticket type', () => {
    render(<TicketSelector eventId="evt-1" tickets={[GA, VIP]} />);
    expect(screen.getByText('40 seats left')).toBeInTheDocument();
    expect(screen.getByText('1 seat left')).toBeInTheDocument();
  });

  it('disables sold-out ticket types', () => {
    render(<TicketSelector eventId="evt-1" tickets={[GA, { ...VIP, seatsRemaining: 0 }]} />);
    expect(screen.getByRole('radio', { name: /VIP/ })).toBeDisabled();
    expect(screen.getByText('Sold out')).toBeInTheDocument();
  });

  it('shows no buy button when the only ticket type is sold out', () => {
    render(<TicketSelector eventId="evt-1" tickets={[{ ...GA, seatsRemaining: 0 }]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Sold out')).toBeInTheDocument();
  });

  it('passes the chosen quantity to checkout', () => {
    render(<TicketSelector eventId="evt-1" tickets={[GA]} />);
    fireEvent.change(screen.getByLabelText('Number of tickets'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buy Ticket' }));
    expect(push).toHaveBeenLastCalledWith(
      '/checkout?eventId=evt-1&ticketTypeId=tt-ga&quantity=3&max=10',
    );
  });

  it('caps quantity at the seats left', () => {
    render(<TicketSelector eventId="evt-1" tickets={[{ ...GA, seatsRemaining: 4 }]} />);
    const input = screen.getByLabelText('Number of tickets');
    expect(input).toHaveAttribute('max', '4');
    fireEvent.change(input, { target: { value: '9' } });
    expect(input).toHaveValue(4);
  });

  it('re-caps quantity when switching to a ticket type with fewer seats', () => {
    render(<TicketSelector eventId="evt-1" tickets={[GA, VIP]} />);
    fireEvent.click(screen.getByRole('radio', { name: /General/ }));
    fireEvent.change(screen.getByLabelText('Number of tickets'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('radio', { name: /VIP/ }));
    expect(screen.getByLabelText('Number of tickets')).toHaveValue(1);
  });

  it('hides the quantity field when sold out', () => {
    render(<TicketSelector eventId="evt-1" tickets={[{ ...GA, seatsRemaining: 0 }]} />);
    expect(screen.queryByLabelText('Number of tickets')).not.toBeInTheDocument();
  });
});
