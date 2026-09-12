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
import {
  BackLink,
  StatusBadge,
  tableClassName,
  tableShellClassName,
  tdClassName,
  tdNumClassName,
  tdPrimaryClassName,
  theadClassName,
  thClassName,
  thNumClassName,
  trClassName,
} from '@/components/admin/ui';

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
      <BackLink href="/admin/orders" label="Back to Orders" />
      <h1 className="text-2xl font-semibold text-neutral-900">Order {order.id}</h1>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Event</dt>
          <dd className="mt-1 text-neutral-900">{order.event.title}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Buyer</dt>
          <dd className="mt-1 text-neutral-900">
            {order.buyerName} ({order.buyerEmail})
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Status</dt>
          <dd className="mt-1">
            <StatusBadge status={order.status} />
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Total</dt>
          <dd className="mt-1 tabular-nums text-neutral-900">{formatMoney(order.totalMinorUnits, order.currency)}</dd>
        </div>
      </dl>

      {order.status === 'PAID' && canRefund ? (
        <div className="mt-6">
          <RefundOrderButton orderId={order.id} />
        </div>
      ) : null}

      <h2 className="mt-10 text-lg font-semibold text-neutral-900">Payments</h2>
      <div className={`${tableShellClassName} mt-4 max-w-2xl`}>
        <table className={tableClassName}>
          <thead className={theadClassName}>
            <tr className="border-b border-neutral-200">
              <th scope="col" className={thClassName}>Provider Payment</th>
              <th scope="col" className={thClassName}>Status</th>
              <th scope="col" className={thNumClassName}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.payments.map((payment) => (
              <tr key={payment.id} className={trClassName}>
                <td className={`${tdClassName} font-mono text-xs`}>{payment.providerPaymentId ?? '—'}</td>
                <td className={tdClassName}>
                  <StatusBadge status={payment.status} />
                </td>
                <td className={tdNumClassName}>{formatMoney(payment.amountMinorUnits, payment.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-neutral-900">Attendees</h2>
      <div className={`${tableShellClassName} mt-4 overflow-x-auto`}>
        <table className={`${tableClassName} min-w-[900px]`}>
          <thead className={theadClassName}>
            <tr className="border-b border-neutral-200">
              <th scope="col" className={thClassName}>Name</th>
              <th scope="col" className={thClassName}>Email</th>
              <th scope="col" className={thClassName}>Registration</th>
              <th scope="col" className={thClassName}>Attended</th>
              <th scope="col" className={thClassName}>Notes</th>
              <th scope="col" className={thClassName}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {order.items.flatMap((item) =>
              item.attendees.map((attendee) => {
                const registration = registrationsByAttendeeId.get(attendee.id);
                return (
                  <tr key={attendee.id} className={`${trClassName} align-top`}>
                    <td className={tdPrimaryClassName}>
                      {attendee.firstName} {attendee.lastName}
                    </td>
                    <td className={tdClassName}>{attendee.email}</td>
                    <td className={tdClassName}>
                      {registration ? `${registration.reference} (${registration.status})` : '—'}
                    </td>
                    <td className={tdClassName}>
                      {attendee.attendedAt ? DATE_FORMATTER.format(attendee.attendedAt) : '—'}
                    </td>
                    <td className={tdClassName}>
                      <AttendeeNoteForm attendeeId={attendee.id} initialNote={attendee.internalNotes ?? ''} />
                    </td>
                    <td className={tdClassName}>
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
