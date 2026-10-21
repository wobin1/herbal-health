import { describe, expect, it } from 'vitest';
import { renderEmailTemplate, renderAdminLoginCodeEmail } from '@/lib/email/templates';

const BASE_VARS = {
  attendeeFirstName: 'Jane',
  eventTitle: 'Herbal Basics',
  eventStartAt: '2026-06-01T00:00:00.000Z',
  eventLocation: 'Austin, TX',
  registrationReference: 'HHS-2026-ABCDEF',
};

describe('renderEmailTemplate', () => {
  it('interpolates attendee, event, and registration variables into the confirmation email', () => {
    const result = renderEmailTemplate('REGISTRATION_CONFIRMATION', BASE_VARS);
    expect(result.subject).toContain('Herbal Basics');
    expect(result.text).toContain('Jane');
    expect(result.text).toContain('HHS-2026-ABCDEF');
    expect(result.html).toContain('Jane');
  });

  it('shows the ticket type on the confirmation email when provided', () => {
    const result = renderEmailTemplate('REGISTRATION_CONFIRMATION', { ...BASE_VARS, ticketTypeName: 'VIP' });
    expect(result.text).toContain('Ticket: VIP');
  });

  it('renders a distinct subject/body per email type', () => {
    const confirmation = renderEmailTemplate('REGISTRATION_CONFIRMATION', BASE_VARS);
    const cancellation = renderEmailTemplate('EVENT_CANCELLATION', BASE_VARS);
    expect(confirmation.subject).not.toEqual(cancellation.subject);
  });

  it('renders the refund amount into the refund confirmation email', () => {
    const result = renderEmailTemplate('REFUND_CONFIRMATION', { ...BASE_VARS, amount: '$50.00' });
    expect(result.text).toContain('$50.00');
  });

  it('renders the new attendee name into the transfer email', () => {
    const result = renderEmailTemplate('REGISTRATION_TRANSFER', {
      ...BASE_VARS,
      newAttendeeName: 'Alex Smith',
    });
    expect(result.text).toContain('Alex Smith');
  });
});

describe('email layout', () => {
  it('escapes user-supplied values in the HTML body', () => {
    const result = renderEmailTemplate('REGISTRATION_CONFIRMATION', {
      ...BASE_VARS,
      attendeeFirstName: '<a href="https://evil.test">Jane</a>',
    });
    expect(result.html).not.toContain('<a href="https://evil.test">');
    expect(result.html).toContain('&lt;a href=&quot;https://evil.test&quot;&gt;');
  });

  it('renders a full branded HTML document with the event details', () => {
    const result = renderEmailTemplate('REGISTRATION_CONFIRMATION', BASE_VARS);
    expect(result.html).toMatch(/^<!doctype html>/i);
    expect(result.html).toContain('Herbal Health');
    expect(result.html).toContain('Austin, TX');
    expect(result.html).toContain('HHS-2026-ABCDEF');
  });

  it('includes the event details in the plain-text version too', () => {
    const result = renderEmailTemplate('REGISTRATION_CONFIRMATION', BASE_VARS);
    expect(result.text).toContain('Austin, TX');
    expect(result.text).not.toContain('<');
  });
});

describe('renderAdminLoginCodeEmail', () => {
  it('shows the code prominently and states the expiry', () => {
    const result = renderAdminLoginCodeEmail('482913', 10);
    expect(result.html).toContain('482913');
    expect(result.text).toContain('482913');
    expect(result.text).toContain('10 minutes');
  });

  it('keeps the code out of the subject line, which is visible on lock screens', () => {
    expect(renderAdminLoginCodeEmail('482913', 10).subject).not.toContain('482913');
  });
});
