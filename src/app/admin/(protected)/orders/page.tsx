import Link from 'next/link';
import { requirePermission } from '@/lib/auth/require-admin';
import { listOrders } from '@/server/services/order-service';
import type { OrderStatus } from '@prisma/client';
import { parsePageParams } from '@/lib/pagination';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { ReceiptIcon } from '@/components/admin/icons';
import {
  EmptyState,
  StatusBadge,
  rowActionsClassName,
  tableClassName,
  tableShellClassName,
  tdClassName,
  tdNumClassName,
  theadClassName,
  thClassName,
  thNumClassName,
  trClassName,
} from '@/components/admin/ui';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const VALID_STATUSES: OrderStatus[] = ['PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED'];

function formatMoney(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minorUnits / 100);
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; buyerEmail?: string; page?: string }>;
}) {
  await requirePermission('payments:view');
  const params = await searchParams;
  const status = params.status && VALID_STATUSES.includes(params.status as OrderStatus) ? (params.status as OrderStatus) : undefined;
  const pageParams = parsePageParams(params);
  const { items: orders, page, totalPages, total } = await listOrders({ status, buyerEmail: params.buyerEmail }, pageParams);
  const isFiltered = Boolean(params.status || params.buyerEmail);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Orders</h1>
          <p className="mt-1 text-sm text-neutral-500">{total} total</p>
        </div>
        <a
          href="/api/admin/attendees/export"
          className="text-sm font-medium text-primary-950 underline-offset-2 hover:underline"
        >
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
            className="mt-1 rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/30"
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
            className="mt-1 rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/30"
          >
            <option value="">All</option>
            {VALID_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-full bg-primary-950 px-5 py-2 text-sm font-medium text-neutral-50 transition-colors hover:bg-primary-900"
        >
          Search
        </button>
      </form>

      <div className="mt-8">
        {orders.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon className="h-8 w-8" />}
            title={isFiltered ? 'No orders match these filters' : 'No orders yet'}
            description={isFiltered ? 'Try a different email or status.' : 'Orders will show up here once tickets sell.'}
          />
        ) : (
          <div className={`${tableShellClassName} overflow-x-auto`}>
            <table className={`${tableClassName} min-w-[800px]`}>
              <thead className={theadClassName}>
                <tr className="border-b border-neutral-200">
                  <th scope="col" className={thClassName}>Order</th>
                  <th scope="col" className={thClassName}>Event</th>
                  <th scope="col" className={thClassName}>Buyer</th>
                  <th scope="col" className={thClassName}>Placed</th>
                  <th scope="col" className={thClassName}>Status</th>
                  <th scope="col" className={thNumClassName}>Total</th>
                  <th scope="col" className={thClassName}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className={trClassName}>
                    <td className={`${tdClassName} font-mono text-xs`}>{order.id}</td>
                    <td className="px-4 py-3 align-middle font-medium text-neutral-900">{order.event.title}</td>
                    <td className={tdClassName}>
                      {order.buyerName} ({order.buyerEmail})
                    </td>
                    <td className={tdClassName}>{DATE_FORMATTER.format(order.createdAt)}</td>
                    <td className={tdClassName}>
                      <StatusBadge status={order.status} />
                    </td>
                    <td className={tdNumClassName}>{formatMoney(order.totalMinorUnits, order.currency)}</td>
                    <td className={tdClassName}>
                      <div className={rowActionsClassName}>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-medium text-primary-950 underline-offset-2 hover:underline"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          basePath="/admin/orders"
          searchParams={{ status: params.status, buyerEmail: params.buyerEmail }}
        />
      </div>
    </div>
  );
}
