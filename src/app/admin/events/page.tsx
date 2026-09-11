import Link from 'next/link';
import { requirePermission } from '@/lib/auth/require-admin';
import { listAdminEvents } from '@/server/services/event-service';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

export default async function AdminEventsPage() {
  await requirePermission('events:edit');
  const events = await listAdminEvents();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Events</h1>
        <Link
          href="/admin/events/new"
          className="rounded-full bg-primary-950 px-5 py-2 text-sm font-medium text-neutral-50"
        >
          New Event
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-500">
              <th scope="col" className="py-2 pr-4">Event</th>
              <th scope="col" className="py-2 pr-4">Location</th>
              <th scope="col" className="py-2 pr-4">Date</th>
              <th scope="col" className="py-2 pr-4">Status</th>
              <th scope="col" className="py-2 pr-4">Tickets Sold</th>
              <th scope="col" className="py-2 pr-4">Capacity</th>
              <th scope="col" className="py-2 pr-4">Revenue</th>
              <th scope="col" className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const capacity = event.ticketTypes.reduce((sum, t) => sum + t.capacity, 0);
              return (
                <tr key={event.id} className="border-b border-neutral-100">
                  <td className="py-3 pr-4 font-medium text-neutral-900">{event.title}</td>
                  <td className="py-3 pr-4 text-neutral-600">{event.location?.name ?? `${event.city}, ${event.state}`}</td>
                  <td className="py-3 pr-4 text-neutral-600">{DATE_FORMATTER.format(event.startAt)}</td>
                  <td className="py-3 pr-4 text-neutral-600">{event.status}</td>
                  <td className="py-3 pr-4 text-neutral-600">0</td>
                  <td className="py-3 pr-4 text-neutral-600">{capacity}</td>
                  <td className="py-3 pr-4 text-neutral-600">$0.00</td>
                  <td className="py-3 pr-4">
                    <Link href={`/admin/events/${event.id}`} className="text-primary-950 underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {events.length === 0 ? <p className="mt-6 text-neutral-600">No events yet.</p> : null}
      </div>
    </div>
  );
}
