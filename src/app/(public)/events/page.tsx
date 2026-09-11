import Link from 'next/link';
import type { Metadata } from 'next';
import { listPublicEvents } from '@/server/services/event-service';
import { getEventStatusCta } from '@/lib/events/status-cta';

export const metadata: Metadata = {
  title: 'Upcoming Seminars',
  description: 'Browse and search upcoming Herbal Health seminars by keyword, city, state, or date.',
};

const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

interface EventsPageProps {
  searchParams: Promise<{
    keyword?: string;
    city?: string;
    state?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const filters = {
    keyword: params.keyword?.trim() || undefined,
    city: params.city?.trim() || undefined,
    state: params.state?.trim() || undefined,
    dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
    dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
  };
  const events = await listPublicEvents(filters);

  return (
    <article className="mx-auto max-w-6xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Upcoming Seminars</h1>

      <form className="mt-10 grid gap-4 rounded-lg border border-neutral-100 p-6 sm:grid-cols-5" role="search">
        <div className="sm:col-span-2">
          <label htmlFor="keyword" className="block text-sm font-medium text-neutral-900">
            Keyword
          </label>
          <input
            id="keyword"
            name="keyword"
            type="text"
            defaultValue={params.keyword}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950"
          />
        </div>
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-neutral-900">
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            defaultValue={params.city}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950"
          />
        </div>
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-neutral-900">
            State
          </label>
          <input
            id="state"
            name="state"
            type="text"
            defaultValue={params.state}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950"
          />
        </div>
        <div>
          <label htmlFor="dateFrom" className="block text-sm font-medium text-neutral-900">
            From
          </label>
          <input
            id="dateFrom"
            name="dateFrom"
            type="date"
            defaultValue={params.dateFrom}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950"
          />
        </div>
        <div className="sm:col-span-5">
          <button
            type="submit"
            className="rounded-full bg-primary-950 px-6 py-2 text-sm font-medium text-neutral-50 hover:bg-primary-900"
          >
            Search
          </button>
        </div>
      </form>

      {events.length > 0 ? (
        <ul className="mt-10 grid gap-6 sm:grid-cols-3">
          {events.map((event) => {
            const cta = getEventStatusCta(event.status);
            return (
              <li key={event.id} className="rounded-lg border border-neutral-100 p-6">
                <p className="text-sm text-neutral-600">{EVENT_DATE_FORMATTER.format(event.startAt)}</p>
                <h2 className="mt-2 text-lg font-semibold text-neutral-900">{event.title}</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  {event.city}, {event.state}
                </p>
                {cta.label ? (
                  <Link
                    href={`/events/${event.slug}`}
                    className="mt-4 inline-block rounded-full border border-primary-950 px-5 py-2 text-sm font-medium text-primary-950 hover:bg-primary-950 hover:text-neutral-50"
                  >
                    {cta.label}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-10 text-neutral-600">No seminars match your search.</p>
      )}
    </article>
  );
}
