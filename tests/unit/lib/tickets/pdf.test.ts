import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { buildTicketsPdf } from '@/lib/tickets/pdf';

const event = {
  title: 'Herbal Basics',
  startAt: new Date('2026-06-01T15:00:00Z'),
  timezone: 'America/Chicago',
  city: 'Austin',
  state: 'TX',
};

describe('buildTicketsPdf', () => {
  it('renders one page per ticket as a valid PDF', async () => {
    const bytes = await buildTicketsPdf(event, [
      { reference: 'HH-AAAA', attendeeName: 'Jane Doe', ticketTypeName: 'General' },
      { reference: 'HH-BBBB', attendeeName: 'John Roe', ticketTypeName: 'VIP' },
    ]);
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
  });
});
