import type { EmailType } from '@prisma/client';

/**
 * Variable set per email type, matching the placeholder names from
 * docs/herbal-health-seminar-platform-product-spec.md §27
 * ({{attendee.firstName}}, {{event.title}}, etc.).
 */
export interface EmailVariables {
  attendeeFirstName: string;
  eventTitle: string;
  eventStartAt: string;
  eventLocation: string;
  registrationReference?: string;
  orderTotal?: string;
  amount?: string;
  newAttendeeName?: string;
  reminderLabel?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function wrap(bodyLines: string[]): { html: string; text: string } {
  const text = bodyLines.join('\n\n');
  const html = `<div>${bodyLines.map((line) => `<p>${line}</p>`).join('')}</div>`;
  return { html, text };
}

export function renderEmailTemplate(type: EmailType, v: EmailVariables): RenderedEmail {
  switch (type) {
    case 'REGISTRATION_CONFIRMATION': {
      const { html, text } = wrap([
        `Hi ${v.attendeeFirstName},`,
        `You're registered for ${v.eventTitle} on ${v.eventStartAt} at ${v.eventLocation}.`,
        `Your registration reference is ${v.registrationReference}.`,
      ]);
      return { subject: `You're registered: ${v.eventTitle}`, html, text };
    }
    case 'PAYMENT_RECEIPT': {
      const { html, text } = wrap([
        `Hi ${v.attendeeFirstName},`,
        `Thanks for your payment of ${v.orderTotal} for ${v.eventTitle}.`,
        `Registration reference: ${v.registrationReference}.`,
      ]);
      return { subject: `Payment receipt: ${v.eventTitle}`, html, text };
    }
    case 'PAYMENT_FAILURE': {
      const { html, text } = wrap([
        `Hi ${v.attendeeFirstName},`,
        `We weren't able to process your payment for ${v.eventTitle}. No registration was created and you have not been charged.`,
        `Please try again to secure your spot.`,
      ]);
      return { subject: `Payment failed: ${v.eventTitle}`, html, text };
    }
    case 'EVENT_REMINDER': {
      const { html, text } = wrap([
        `Hi ${v.attendeeFirstName},`,
        `This is a reminder that ${v.eventTitle} is coming up ${v.reminderLabel} on ${v.eventStartAt} at ${v.eventLocation}.`,
        `Your registration reference is ${v.registrationReference}.`,
      ]);
      return { subject: `Reminder: ${v.eventTitle} ${v.reminderLabel}`, html, text };
    }
    case 'EVENT_UPDATE': {
      const { html, text } = wrap([
        `Hi ${v.attendeeFirstName},`,
        `Details for ${v.eventTitle} have changed. It is now scheduled for ${v.eventStartAt} at ${v.eventLocation}.`,
        `Your registration reference is ${v.registrationReference}.`,
      ]);
      return { subject: `Updated details: ${v.eventTitle}`, html, text };
    }
    case 'EVENT_CANCELLATION': {
      const { html, text } = wrap([
        `Hi ${v.attendeeFirstName},`,
        `${v.eventTitle} on ${v.eventStartAt} has been cancelled.`,
        `Your registration reference is ${v.registrationReference}. If you paid for this event, a refund will be processed separately.`,
      ]);
      return { subject: `Cancelled: ${v.eventTitle}`, html, text };
    }
    case 'REGISTRATION_CANCELLATION': {
      const { html, text } = wrap([
        `Hi ${v.attendeeFirstName},`,
        `Your registration for ${v.eventTitle} on ${v.eventStartAt} has been cancelled.`,
        `Registration reference: ${v.registrationReference}.`,
      ]);
      return { subject: `Registration cancelled: ${v.eventTitle}`, html, text };
    }
    case 'REFUND_CONFIRMATION': {
      const { html, text } = wrap([
        `Hi ${v.attendeeFirstName},`,
        `We've refunded ${v.amount} for your registration to ${v.eventTitle}.`,
        `Registration reference: ${v.registrationReference}.`,
      ]);
      return { subject: `Refund confirmation: ${v.eventTitle}`, html, text };
    }
    case 'REGISTRATION_TRANSFER': {
      const { html, text } = wrap([
        `Hi ${v.attendeeFirstName},`,
        `Your registration for ${v.eventTitle} has been transferred to ${v.newAttendeeName}.`,
        `Registration reference: ${v.registrationReference}.`,
      ]);
      return { subject: `Registration transferred: ${v.eventTitle}`, html, text };
    }
    case 'ADMIN_NEW_REGISTRATION': {
      const { html, text } = wrap([
        `New registration for ${v.eventTitle}.`,
        `Attendee: ${v.attendeeFirstName}. Reference: ${v.registrationReference}.`,
      ]);
      return { subject: `New registration: ${v.eventTitle}`, html, text };
    }
    default: {
      const exhaustive: never = type;
      throw new Error(`No email template for type ${exhaustive}`);
    }
  }
}
