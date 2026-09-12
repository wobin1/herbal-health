/**
 * Provider-agnostic payment port. Checkout and webhook business logic depend
 * only on this interface; `stripe.ts` is the only implementation for now
 * (decision: Stripe Checkout). Swapping providers later means adding a new
 * implementation of this interface, not touching callers.
 */

export interface CreateCheckoutSessionInput {
  orderId: string;
  amountMinorUnits: number;
  currency: string;
  buyerEmail: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  /** Provider-side session id, stored on the Order for reconciliation. */
  id: string;
  /** URL to redirect the buyer to in order to pay. */
  url: string;
}

/** A normalized webhook event this app cares about. */
export type PaymentWebhookEvent =
  | {
      type: 'checkout.session.completed';
      providerEventId: string;
      checkoutSessionId: string;
      orderId: string;
      paymentIntentId: string | null;
      amountMinorUnits: number;
      currency: string;
      raw: unknown;
    }
  | {
      type: 'unhandled';
      providerEventId: string;
      raw: unknown;
    };

export class InvalidWebhookSignatureError extends Error {}

export interface RefundPaymentInput {
  /** Provider payment id (e.g. Stripe PaymentIntent id) to refund. */
  providerPaymentId: string;
  /** Amount to refund, in minor units. Always server-computed from the Payment record. */
  amountMinorUnits: number;
}

export interface RefundResult {
  /** Provider-side refund id, for reconciliation. */
  id: string;
}

export interface PaymentProvider {
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession>;
  /**
   * Verifies the provider signature on a raw webhook payload and parses it
   * into a normalized event. Throws InvalidWebhookSignatureError if the
   * signature does not verify.
   */
  parseWebhookEvent(rawBody: string, signatureHeader: string | null): PaymentWebhookEvent;
  /** Issues a refund for a previously captured payment. */
  refundPayment(input: RefundPaymentInput): Promise<RefundResult>;
}
