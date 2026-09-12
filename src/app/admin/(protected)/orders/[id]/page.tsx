import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/require-admin';
import { hasPermission } from '@/lib/auth/rbac';
import { getOrderDetail, OrderNotFoundError } from '@/server/services/order-service';
import {
  AttendeeNoteForm,
  CancelRegistrationButton,
  MarkAttendedButton,
  RefundOrderButton,
  ResendConfirmationButton,
} from '@/app/admin/(protected)/orders/order-actions';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });

function formatMoney(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minorUnits / 100);
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('payments:view');
  const { id } = await params;

  let order;
  try {
    order = await getOrderDetail(id);
  } catch (error) {
    if (error instanceof OrderNotFoundError) notFound();
    throw error;
  }

  const canRefund = hasPermission(session.adminUser.role, 'refunds:process');
  const registrationsByAttendeeId = new Map(order.registrations.map((r) => [r.attendeeId, r]));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Order {order.id}</h1>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
        <div>
          <dt className="text-neutral-500">Event</dt>
          <dd className="text-neutral-900">{order.event.title}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Buyer</dt>
          <dd className="text-neutral-900">
            {order.buyerName} ({order.buyerEmail})
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">Status</dt>
          <dd className="text-neutral-900">{order.status}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Total</dt>
          <dd className="text-neutral-900">{formatMoney(order.totalMinorUnits, order.currency)}</dd>
        </div>
      </dl>

      {order.status === 'PAID' && canRefund ? (
        <div className="mt-6">
          <RefundOrderButton orderId={order.id} />
        </div>
      ) : null}

      <h2 className="mt-10 text-lg font-semibold text-neutral-900">Payments</h2>
      <table className="mt-4 w-full max-w-2xl border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-neutral-500">
            <th scope="col" className="py-2 pr-4">Provider Payment</th>
            <th scope="col" className="py-2 pr-4">Status</th>
            <th scope="col" className="py-2 pr-4">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.payments.map((payment) => (
            <tr key={payment.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4 font-mono text-xs text-neutral-600">{payment.providerPaymentId ?? '—'}</td>
              <td className="py-2 pr-4 text-neutral-600">{payment.status}</td>
              <td className="py-2 pr-4 text-neutral-600">{formatMoney(payment.amountMinorUnits, payment.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-10 text-lg font-semibold text-neutral-900">Attendees</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-500">
              <th scope="col" className="py-2 pr-4">Name</th>
              <th scope="col" className="py-2 pr-4">Email</th>
              <th scope="col" className="py-2 pr-4">Registration</th>
              <th scope="col" className="py-2 pr-4">Attended</th>
              <th scope="col" className="py-2 pr-4">Notes</th>
              <th scope="col" className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {order.items.flatMap((item) =>
              item.attendees.map((attendee) => {
                const registration = registrationsByAttendeeId.get(attendee.id);
                return (
                  <tr key={attendee.id} className="border-b border-neutral-100 align-top">
                    <td className="py-3 pr-4 text-neutral-900">
                      {attendee.firstName} {attendee.lastName}
                    </td>
                    <td className="py-3 pr-4 text-neutral-600">{attendee.email}</td>
                    <td className="py-3 pr-4 text-neutral-600">
                      {registration ? `${registration.reference} (${registration.status})` : '—'}
                    </td>
                    <td className="py-3 pr-4 text-neutral-600">
                      {attendee.attendedAt ? DATE_FORMATTER.format(attendee.attendedAt) : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <AttendeeNoteForm attendeeId={attendee.id} initialNote={attendee.internalNotes ?? ''} />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col items-start gap-2">
                        {registration ? (
                          <>
                            <ResendConfirmationButton registrationId={registration.id} />
                            {registration.status === 'CONFIRMED' ? (
                              <>
                                <MarkAttendedButton registrationId={registration.id} />
                                <CancelRegistrationButton registrationId={registration.id} />
                              </>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
