import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { listPublicEvents } from '@/server/services/event-service';
import { getEventStatusCta } from '@/lib/events/status-cta';
import { PageHero } from '@/components/page-hero';
import { parsePageParams } from '@/lib/pagination';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { EmptyState } from '@/components/admin/ui';
import { CalendarIcon } from '@/components/admin/icons';

const EVENTS_PAGE_SIZE = 12;

export const metadata: Metadata = {
  title: 'Upcoming Seminars',
  description: 'Browse and search upcoming Herbal Health seminars by keyword, city, state, or date.',
};

const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

function formatStartingPrice(ticketTypes: Array<{ priceMinorUnits: number; currency: string }>): string | null {
  if (ticketTypes.length === 0) return null;
  const cheapest = ticketTypes.reduce((min, t) => (t.priceMinorUnits < min.priceMinorUnits ? t : min));
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: cheapest.currency }).format(
    cheapest.priceMinorUnits / 100,
  );
  return `From ${formatted}`;
}

function totalCapacity(ticketTypes: Array<{ capacity: number }>): number {
  return ticketTypes.reduce((sum, t) => sum + t.capacity, 0);
}

interface EventsPageProps {
  searchParams: Promise<{
    keyword?: string;
    city?: string;
    state?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
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
  const pageParams = parsePageParams(params, EVENTS_PAGE_SIZE);
  const { items: events, page, totalPages, total } = await listPublicEvents(filters, pageParams);
  const isFiltered = Object.values(filters).some((value) => value !== undefined);

  return (
    <article>
      <PageHero
        badge="Herbal Health Seminar Series"
        heading="Upcoming Seminars"
        description="Browse and search upcoming seminars by keyword, city, state, or date."
        imageSrc="https://images.unsplash.com/photo-1702957431032-b4d85658a908?q=80&w=2000&auto=format&fit=crop"
      />

      <div className="mx-auto max-w-6xl px-6">
        <form
          className="grid -translate-y-16 gap-4 rounded-2xl bg-neutral-50 p-6 shadow-xl shadow-neutral-900/10 ring-1 ring-neutral-900/5 sm:grid-cols-5"
          role="search"
        >
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
          <div className="flex items-end sm:col-span-5">
            <button
              type="submit"
              className="rounded-full bg-primary-950 px-6 py-2.5 text-sm font-medium text-neutral-50 transition hover:bg-primary-900"
            >
              Search
            </button>
          </div>
        </form>

        {events.length > 0 ? (
          <ul className="-mt-8 grid gap-8 pb-8 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const cta = getEventStatusCta(event.status);
              const startingPrice = formatStartingPrice(event.ticketTypes);
              const capacity = totalCapacity(event.ticketTypes);
              return (
                <li
                  key={event.id}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-neutral-50 shadow-md shadow-neutral-900/5 ring-1 ring-neutral-900/5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-neutral-900/10"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-primary-900">
                    {event.coverImageUrl ? (
                      <Image
                        src={event.coverImageUrl}
                        alt=""
                        fill
                        unoptimized={event.coverImageUrl.endsWith('.svg') || event.coverImageUrl.includes('placehold.co')}
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="from-primary-700 to-primary-950 h-full w-full bg-gradient-to-br" />
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-neutral-50/95 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-950 shadow-sm">
                      {EVENT_DATE_FORMATTER.format(event.startAt)}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-neutral-900">{event.title}</h2>
                      <p className="mt-1 text-sm text-neutral-600">
                        {event.city}, {event.state}
                      </p>
                      {startingPrice || capacity > 0 ? (
                        <p className="mt-3 text-sm font-medium text-neutral-900">
                          {startingPrice}
                          {startingPrice && capacity > 0 ? ' · ' : ''}
                          {capacity > 0 ? `${capacity} seats` : ''}
                        </p>
                      ) : null}
                    </div>
                    {cta.label ? (
                      <Link
                        href={`/events/${event.slug}`}
                        className="mt-5 inline-flex w-fit items-center rounded-full border border-primary-950 px-5 py-2 text-sm font-medium text-primary-950 transition hover:bg-primary-950 hover:text-neutral-50"
                      >
                        {cta.label}
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="pb-20 pt-2">
            <EmptyState
              icon={<CalendarIcon className="h-8 w-8" />}
              title={isFiltered ? 'No seminars match your search' : 'No seminars scheduled yet'}
              description={
                isFiltered
                  ? 'Try a broader keyword, or clear a filter like city, state, or date.'
                  : 'New seminars are added regularly — check back soon or browse our other resources.'
              }
              action={
                isFiltered ? (
                  <Link
                    href="/events"
                    className="rounded-full border border-primary-950 px-5 py-2 text-sm font-medium text-primary-950 transition hover:bg-primary-950 hover:text-neutral-50"
                  >
                    Clear filters
                  </Link>
                ) : undefined
              }
            />
          </div>
        )}
        {events.length > 0 ? (
          <div className="pb-20">
            <PaginationControls
              page={page}
              totalPages={totalPages}
              total={total}
              basePath="/events"
              searchParams={{
                keyword: params.keyword,
                city: params.city,
                state: params.state,
                dateFrom: params.dateFrom,
                dateTo: params.dateTo,
              }}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
