import Link from 'next/link';
import { requirePermission } from '@/lib/auth/require-admin';
import { listAdminEvents } from '@/server/services/event-service';
import { parsePageParams } from '@/lib/pagination';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { CalendarIcon } from '@/components/admin/icons';
import { EventDeleteButton } from '@/components/admin/event-delete-button';
import {
  EmptyState,
  StatusBadge,
  rowActionsClassName,
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

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

function formatStartingPrice(ticketTypes: Array<{ priceMinorUnits: number; currency: string }>): string {
  if (ticketTypes.length === 0) return '—';
  const cheapest = ticketTypes.reduce((min, t) => (t.priceMinorUnits < min.priceMinorUnits ? t : min));
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: cheapest.currency }).format(
    cheapest.priceMinorUnits / 100,
  );
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePermission('events:edit');
  const params = await searchParams;
  const pageParams = parsePageParams(params);
  const { items: events, page, totalPages, total } = await listAdminEvents({}, pageParams);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Events</h1>
          <p className="mt-1 text-sm text-neutral-500">{total} total</p>
        </div>
        <Link
          href="/admin/events/new"
          className="rounded-full bg-primary-950 px-5 py-2 text-sm font-medium text-neutral-50 transition-colors hover:bg-primary-900"
        >
          New Event
        </Link>
      </div>

      <div className="mt-8">
        {events.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon className="h-8 w-8" />}
            title="No events yet"
            description="Create your first event to start selling tickets."
            action={
              <Link
                href="/admin/events/new"
                className="rounded-full bg-primary-950 px-5 py-2 text-sm font-medium text-neutral-50 transition-colors hover:bg-primary-900"
              >
                New Event
              </Link>
            }
          />
        ) : (
          <div className={`${tableShellClassName} overflow-x-auto`}>
            <table className={`${tableClassName} min-w-[800px]`}>
              <thead className={theadClassName}>
                <tr className="border-b border-neutral-200">
                  <th scope="col" className={thClassName}>Event</th>
                  <th scope="col" className={thClassName}>Location</th>
                  <th scope="col" className={thClassName}>Date</th>
                  <th scope="col" className={thClassName}>Status</th>
                  <th scope="col" className={thNumClassName}>Tickets Sold</th>
                  <th scope="col" className={thNumClassName}>Capacity</th>
                  <th scope="col" className={thNumClassName}>Starting Price</th>
                  <th scope="col" className={thNumClassName}>Revenue</th>
                  <th scope="col" className={thClassName}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const capacity = event.ticketTypes.reduce((sum, t) => sum + t.capacity, 0);
                  return (
                    <tr key={event.id} className={trClassName}>
                      <td className={tdPrimaryClassName}>{event.title}</td>
                      <td className={tdClassName}>{event.location?.name ?? `${event.city}, ${event.state}`}</td>
                      <td className={tdClassName}>{DATE_FORMATTER.format(event.startAt)}</td>
                      <td className={tdClassName}>
                        <StatusBadge status={event.status} />
                      </td>
                      <td className={tdNumClassName}>0</td>
                      <td className={tdNumClassName}>{capacity}</td>
                      <td className={tdNumClassName}>{formatStartingPrice(event.ticketTypes)}</td>
                      <td className={tdNumClassName}>$0.00</td>
                      <td className={tdClassName}>
                        <div className={rowActionsClassName}>
                          <Link
                            href={`/admin/events/${event.id}`}
                            className="font-medium text-primary-950 underline-offset-2 hover:underline"
                          >
                            Edit
                          </Link>
                          {event.status === 'DRAFT' ? <EventDeleteButton eventId={event.id} /> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <PaginationControls page={page} totalPages={totalPages} total={total} basePath="/admin/events" />
      </div>
    </div>
  );
}
