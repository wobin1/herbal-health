import Link from 'next/link';
import { requirePermission } from '@/lib/auth/require-admin';
import { listOrders } from '@/server/services/order-service';
import type { OrderStatus } from '@prisma/client';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const VALID_STATUSES: OrderStatus[] = ['PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED'];

function formatMoney(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minorUnits / 100);
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; buyerEmail?: string }>;
}) {
  await requirePermission('payments:view');
  const params = await searchParams;
  const status = params.status && VALID_STATUSES.includes(params.status as OrderStatus) ? (params.status as OrderStatus) : undefined;
  const orders = await listOrders({ status, buyerEmail: params.buyerEmail });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Orders</h1>
        <a href="/api/admin/attendees/export" className="text-sm text-primary-950 underline">
          Export attendees (CSV)
        </a>
      </div>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="buyerEmail" className="block text-sm font-medium text-neutral-700">
            Buyer Email
          </label>
          <input
            id="buyerEmail"
            name="buyerEmail"
            defaultValue={params.buyerEmail ?? ''}
            className="mt-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-neutral-700">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={params.status ?? ''}
            className="mt-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {VALID_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-full bg-primary-950 px-5 py-2 text-sm font-medium text-neutral-50">
          Search
        </button>
      </form>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-500">
              <th scope="col" className="py-2 pr-4">Order</th>
              <th scope="col" className="py-2 pr-4">Event</th>
              <th scope="col" className="py-2 pr-4">Buyer</th>
              <th scope="col" className="py-2 pr-4">Placed</th>
              <th scope="col" className="py-2 pr-4">Status</th>
              <th scope="col" className="py-2 pr-4">Total</th>
              <th scope="col" className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-neutral-100">
                <td className="py-3 pr-4 font-mono text-xs text-neutral-600">{order.id}</td>
                <td className="py-3 pr-4 text-neutral-900">{order.event.title}</td>
                <td className="py-3 pr-4 text-neutral-600">
                  {order.buyerName} ({order.buyerEmail})
                </td>
                <td className="py-3 pr-4 text-neutral-600">{DATE_FORMATTER.format(order.createdAt)}</td>
                <td className="py-3 pr-4 text-neutral-600">{order.status}</td>
                <td className="py-3 pr-4 text-neutral-600">{formatMoney(order.totalMinorUnits, order.currency)}</td>
                <td className="py-3 pr-4">
                  <Link href={`/admin/orders/${order.id}`} className="text-primary-950 underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 ? <p className="mt-6 text-neutral-600">No orders found.</p> : null}
      </div>
    </div>
  );
}
