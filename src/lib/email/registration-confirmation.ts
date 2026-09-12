/**
 * Stub call points for attendee-facing transactional emails. Actual
 * delivery is Phase 6 scope (CLAUDE.md: no speculative provider abstraction
 * here) — these just give callers clearly-named functions so wiring up a
 * real provider later doesn't require touching business logic.
 */
export interface RegistrationConfirmationEmailInput {
  toEmail: string;
  attendeeName: string;
  eventTitle: string;
  reference: string;
}

export async function sendRegistrationConfirmationEmail(
  input: RegistrationConfirmationEmailInput,
): Promise<void> {
  // No-op until Phase 6 wires a real email provider.
  void input;
}

export interface RegistrationCancellationEmailInput {
  toEmail: string;
  attendeeName: string;
  eventTitle: string;
  reference: string;
}

export async function sendRegistrationCancellationEmail(
  input: RegistrationCancellationEmailInput,
): Promise<void> {
  // No-op until Phase 6 wires a real email provider.
  void input;
}

export interface RefundConfirmationEmailInput {
  toEmail: string;
  attendeeName: string;
  eventTitle: string;
  reference: string;
  amountMinorUnits: number;
  currency: string;
}

export async function sendRefundConfirmationEmail(input: RefundConfirmationEmailInput): Promise<void> {
  // No-op until Phase 6 wires a real email provider.
  void input;
}
