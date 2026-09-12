import { describe, expect, it } from 'vitest';
import { renderEmailTemplate } from '@/lib/email/templates';

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
    const result = renderEmailTemplate('REGISTRATION_TRANSFER', { ...BASE_VARS, newAttendeeName: 'Alex Smith' });
    expect(result.text).toContain('Alex Smith');
  });
});
