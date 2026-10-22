import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { formatEventStart } from '@/lib/events/format-start';

export interface TicketPdfEvent {
  title: string;
  startAt: Date;
  timezone: string;
  city: string;
  state: string;
}

export interface TicketPdfTicket {
  reference: string;
  attendeeName: string;
  ticketTypeName: string;
}

/** One A5-landscape page per ticket. Standard fonts only, so text is WinAnsi-safe. */
export async function buildTicketsPdf(event: TicketPdfEvent, tickets: TicketPdfTicket[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.CourierBold);
  const safe = (text: string) => text.replace(/[^\x20-\x7E -ÿ]/g, '?');

  for (const ticket of tickets) {
    const page = doc.addPage([595, 420]);
    const { width, height } = page.getSize();
    page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: rgb(0.1, 0.25, 0.15) });
    page.drawText(safe(ticket.ticketTypeName.toUpperCase()), {
      x: 36, y: height - 38, size: 10, font: regular, color: rgb(0.9, 0.95, 0.9),
    });
    page.drawText(safe(event.title), { x: 36, y: height - 66, size: 20, font: bold, color: rgb(1, 1, 1) });

    const label = (text: string, y: number) =>
      page.drawText(text, { x: 36, y, size: 9, font: regular, color: rgb(0.4, 0.4, 0.4) });
    const value = (text: string, y: number) =>
      page.drawText(safe(text), { x: 36, y, size: 14, font: bold, color: rgb(0.1, 0.1, 0.1) });

    label('REGISTRATION REFERENCE', height - 130);
    page.drawText(safe(ticket.reference), {
      x: 36, y: height - 160, size: 26, font: mono, color: rgb(0.1, 0.1, 0.1),
    });
    label('ATTENDEE', height - 200);
    value(ticket.attendeeName, height - 220);
    label('DATE', height - 255);
    value(formatEventStart(event.startAt, event.timezone), height - 275);
    label('LOCATION', height - 310);
    value(`${event.city}, ${event.state}`, height - 330);
    page.drawText('Keep this reference handy. You may be asked for it at check-in.', {
      x: 36, y: 30, size: 9, font: regular, color: rgb(0.4, 0.4, 0.4),
    });
  }
  return doc.save();
}
