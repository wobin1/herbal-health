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
  ticketTypeName?: string;
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

/** Structured content for one email; the layout turns it into HTML + plain text. */
interface EmailContent {
  /** Inbox preview text shown after the subject. */
  preheader: string;
  heading: string;
  paragraphs: string[];
  /** Label/value rows shown in a details card (event, date, reference…). */
  details?: Array<[label: string, value: string | undefined]>;
  /** Large, letter-spaced value, e.g. a sign-in code. */
  highlight?: string;
  /** Call-to-action button; the URL is also printed in the plain-text body. */
  action?: { label: string; url: string };
  /** Small print under the card. */
  footnote?: string;
}

// Brand palette, mirrored from src/app/globals.css (email clients can't read CSS variables).
const COLOR = {
  forest: '#14291d',
  forestDeep: '#0d1f16',
  green: '#2b5c41',
  accent: '#d97a2b',
  cream: '#faf8f3',
  sand: '#f2efe6',
  ink: '#14201a',
  muted: '#5b6660',
  border: '#e4dfd2',
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHtml(content: EmailContent): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  const details = (content.details ?? []).filter((row): row is [string, string] => Boolean(row[1]));

  const logo = siteUrl
    ? `<img src="${escapeHtml(siteUrl)}/herbal-logo.jpeg" width="36" height="36" alt="" style="display:inline-block;vertical-align:middle;width:36px;height:36px;border-radius:18px;border:0;margin-right:10px;">`
    : '';

  const paragraphs = content.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:${COLOR.ink};">${escapeHtml(p)}</p>`,
    )
    .join('');

  const highlight = content.highlight
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
        <tr><td align="center" style="background:${COLOR.sand};border-radius:12px;padding:24px 16px;">
          <span style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:${COLOR.forest};">${escapeHtml(content.highlight)}</span>
        </td></tr>
      </table>`
    : '';

  const detailRows = details
    .map(
      ([label, value], i) =>
        `<tr>
          <td style="padding:12px 0;${i > 0 ? `border-top:1px solid ${COLOR.border};` : ''}font-family:${SANS};font-size:13px;color:${COLOR.muted};text-transform:uppercase;letter-spacing:0.06em;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:12px 0;${i > 0 ? `border-top:1px solid ${COLOR.border};` : ''}font-family:${SANS};font-size:15px;font-weight:600;color:${COLOR.ink};vertical-align:top;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join('');
  const detailsCard = details.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 8px;background:${COLOR.cream};border:1px solid ${COLOR.border};border-radius:12px;">
        <tr><td style="padding:8px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRows}</table>
        </td></tr>
      </table>`
    : '';

  const action = content.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
        <tr><td style="background:${COLOR.forest};border-radius:999px;">
          <a href="${escapeHtml(content.action.url)}" style="display:inline-block;padding:14px 28px;font-family:${SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(content.action.label)}</a>
        </td></tr>
      </table>`
    : '';

  const footnote = content.footnote
    ? `<p style="margin:24px 0 0;font-family:${SANS};font-size:13px;line-height:1.5;color:${COLOR.muted};">${escapeHtml(content.footnote)}</p>`
    : '';

  const siteLink = siteUrl
    ? `<a href="${escapeHtml(siteUrl)}" style="color:${COLOR.green};text-decoration:underline;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ''))}</a>`
    : 'Herbal Health Seminar Series';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(content.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.sand};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.sand};">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <tr><td style="background:${COLOR.forestDeep};border-radius:16px 16px 0 0;padding:22px 32px;">
        ${logo}<span style="font-family:${SERIF};font-size:20px;color:#ffffff;vertical-align:middle;">Herbal Health</span>
      </td></tr>
      <tr><td style="height:4px;line-height:4px;font-size:0;background:${COLOR.accent};">&nbsp;</td></tr>
      <tr><td style="background:#ffffff;border-radius:0 0 16px 16px;padding:36px 32px 32px;">
        <h1 style="margin:0 0 20px;font-family:${SERIF};font-size:26px;line-height:1.25;font-weight:normal;color:${COLOR.forest};">${escapeHtml(content.heading)}</h1>
        ${paragraphs}${action}${highlight}${detailsCard}${footnote}
      </td></tr>
      <tr><td align="center" style="padding:24px 16px 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${COLOR.muted};">
        Herbal Health Seminar Series · Educational events, not medical advice<br>${siteLink}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function renderText(content: EmailContent): string {
  const parts = [content.heading, ...content.paragraphs];
  if (content.action) parts.push(`${content.action.label}: ${content.action.url}`);
  if (content.highlight) parts.push(content.highlight);
  const details = (content.details ?? []).filter(([, value]) => Boolean(value));
  if (details.length) parts.push(details.map(([label, value]) => `${label}: ${value}`).join('\n'));
  if (content.footnote) parts.push(content.footnote);
  parts.push('— Herbal Health Seminar Series');
  return parts.join('\n\n');
}

function render(subject: string, content: EmailContent): RenderedEmail {
  return { subject, html: renderHtml(content), text: renderText(content) };
}

function eventDetails(v: EmailVariables): EmailContent['details'] {
  return [
    ['Event', v.eventTitle],
    ['Date', v.eventStartAt],
    ['Location', v.eventLocation],
    ['Reference', v.registrationReference],
  ];
}

export function renderEmailTemplate(type: EmailType, v: EmailVariables): RenderedEmail {
  const greeting = `Hi ${v.attendeeFirstName},`;
  switch (type) {
    case 'REGISTRATION_CONFIRMATION':
      return render(`You're registered: ${v.eventTitle}`, {
        preheader: `Your spot at ${v.eventTitle} is confirmed.`,
        heading: "You're registered",
        paragraphs: [
          greeting,
          `Your spot at ${v.eventTitle} is confirmed. We look forward to seeing you there.`,
        ],
        details: [...(eventDetails(v) ?? []), ['Ticket', v.ticketTypeName]],
        footnote: 'Keep your registration reference handy — you may be asked for it at check-in.',
      });
    case 'PAYMENT_RECEIPT':
      return render(`Payment receipt: ${v.eventTitle}`, {
        preheader: `We received your payment of ${v.orderTotal}.`,
        heading: 'Payment received',
        paragraphs: [
          greeting,
          `Thanks for your payment for ${v.eventTitle}. This email is your receipt.`,
        ],
        details: [
          ['Amount paid', v.orderTotal],
          ['Event', v.eventTitle],
          ['Reference', v.registrationReference],
        ],
      });
    case 'PAYMENT_FAILURE':
      return render(`Payment failed: ${v.eventTitle}`, {
        preheader: 'Your payment did not go through. You have not been charged.',
        heading: "Your payment didn't go through",
        paragraphs: [
          greeting,
          `We weren't able to process your payment for ${v.eventTitle}. No registration was created and you have not been charged.`,
          'Please try again to secure your spot.',
        ],
        details: [['Event', v.eventTitle]],
      });
    case 'EVENT_REMINDER':
      return render(`Reminder: ${v.eventTitle} ${v.reminderLabel}`, {
        preheader: `${v.eventTitle} is coming up ${v.reminderLabel}.`,
        heading: `See you ${v.reminderLabel}`,
        paragraphs: [
          greeting,
          `This is a friendly reminder that ${v.eventTitle} is coming up ${v.reminderLabel}.`,
        ],
        details: eventDetails(v),
      });
    case 'EVENT_UPDATE':
      return render(`Updated details: ${v.eventTitle}`, {
        preheader: `The details for ${v.eventTitle} have changed.`,
        heading: 'Event details have changed',
        paragraphs: [
          greeting,
          `Details for ${v.eventTitle} have changed. Here is the updated information.`,
        ],
        details: eventDetails(v),
      });
    case 'EVENT_CANCELLATION':
      return render(`Cancelled: ${v.eventTitle}`, {
        preheader: `${v.eventTitle} has been cancelled.`,
        heading: 'This event has been cancelled',
        paragraphs: [
          greeting,
          `We're sorry — ${v.eventTitle} on ${v.eventStartAt} has been cancelled.`,
          'If you paid for this event, a refund will be processed separately.',
        ],
        details: [
          ['Event', v.eventTitle],
          ['Reference', v.registrationReference],
        ],
      });
    case 'REGISTRATION_CANCELLATION':
      return render(`Registration cancelled: ${v.eventTitle}`, {
        preheader: `Your registration for ${v.eventTitle} has been cancelled.`,
        heading: 'Registration cancelled',
        paragraphs: [
          greeting,
          `Your registration for ${v.eventTitle} on ${v.eventStartAt} has been cancelled.`,
        ],
        details: [
          ['Event', v.eventTitle],
          ['Reference', v.registrationReference],
        ],
      });
    case 'REFUND_CONFIRMATION':
      return render(`Refund confirmation: ${v.eventTitle}`, {
        preheader: `We've refunded ${v.amount}.`,
        heading: 'Your refund is on its way',
        paragraphs: [
          greeting,
          `We've refunded ${v.amount} for your registration to ${v.eventTitle}.`,
        ],
        details: [
          ['Refund amount', v.amount],
          ['Event', v.eventTitle],
          ['Reference', v.registrationReference],
        ],
        footnote: 'Refunds usually take 5–10 business days to appear, depending on your bank.',
      });
    case 'REGISTRATION_TRANSFER':
      return render(`Registration transferred: ${v.eventTitle}`, {
        preheader: `Your registration has been transferred to ${v.newAttendeeName}.`,
        heading: 'Registration transferred',
        paragraphs: [
          greeting,
          `Your registration for ${v.eventTitle} has been transferred to ${v.newAttendeeName}.`,
        ],
        details: [
          ['Event', v.eventTitle],
          ['New attendee', v.newAttendeeName],
          ['Reference', v.registrationReference],
        ],
      });
    case 'ADMIN_NEW_REGISTRATION':
      return render(`New registration: ${v.eventTitle}`, {
        preheader: `${v.attendeeFirstName} registered for ${v.eventTitle}.`,
        heading: 'New registration',
        paragraphs: [`Someone just registered for ${v.eventTitle}.`],
        details: [
          ['Attendee', v.attendeeFirstName],
          ['Event', v.eventTitle],
          ['Reference', v.registrationReference],
        ],
      });
    default: {
      const exhaustive: never = type;
      throw new Error(`No email template for type ${exhaustive}`);
    }
  }
}

/** Sent directly (not via the outbox) so the plain-text code is never persisted. */
export function renderAdminLoginCodeEmail(code: string, expiresInMinutes: number): RenderedEmail {
  return render('Your Herbal Health admin sign-in code', {
    preheader: `Your sign-in code expires in ${expiresInMinutes} minutes.`,
    heading: 'Your sign-in code',
    paragraphs: ['Use this code to finish signing in to the Herbal Health admin dashboard.'],
    highlight: code,
    footnote: `It expires in ${expiresInMinutes} minutes and can be used once. If you didn't try to sign in, someone may know your password — change it and tell another admin.`,
  });
}

/** Sent directly (not via the outbox) so the single-use link is never persisted in plain text. */
export function renderAdminInviteEmail(
  inviteUrl: string,
  roleLabel: string,
  expiresInHours: number,
): RenderedEmail {
  return render("You're invited to the Herbal Health admin dashboard", {
    preheader: `Set your password to join as ${roleLabel}.`,
    heading: "You're invited",
    paragraphs: [
      `You've been invited to join the Herbal Health admin dashboard as ${roleLabel}.`,
      'Choose a password to activate your account. Signing in will also ask for a code we email you.',
    ],
    action: { label: 'Accept invitation', url: inviteUrl },
    footnote: `This link expires in ${expiresInHours} hours and can be used once. If you weren't expecting it, you can ignore this email.`,
  });
}
