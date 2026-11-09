import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@/components/motion/reveal';
import { CalendarIcon } from '@/components/admin/icons';
import { formatInEventTimezone } from '@/lib/events/event-time';

const DATE_OPTIONS: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
const TIME_OPTIONS: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' };

interface UpcomingSeminarEvent {
  id: string;
  slug: string;
  title: string;
  city: string;
  state: string;
  startAt: Date;
  timezone: string;
  coverImageUrl: string | null;
}

/** Light section with image cards (the layout that sits directly under the hero). */
export function HomepageUpcomingSeminars({ events }: { events: UpcomingSeminarEvent[] }) {
  return (
    <section className="bg-neutral-50 py-24" aria-labelledby="events-heading">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <Reveal>
          <p className="text-primary-700/90 text-sm font-semibold tracking-[0.2em] uppercase">Get Involved</p>
          <h2 id="events-heading" className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Upcoming Seminars.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-neutral-600">
            Join Dr. Goodman&apos;s traveling workshops near you. Learn practical herbal preparation, wellness
            fundamentals, and time-tested remedies alongside a community of curious learners.
          </p>
        </Reveal>

        {events.length === 0 ? (
          <div className="mt-14 flex flex-col items-center gap-4 rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="text-primary-700 ring-primary-700/15 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 ring-1 ring-inset">
              <CalendarIcon className="h-7 w-7" />
            </div>
            <div className="max-w-sm">
              <p className="text-base font-semibold text-neutral-900">No seminars on the calendar yet</p>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
                New dates are added regularly — check the events page or contact us to be notified.
              </p>
            </div>
          </div>
        ) : (
          <ul className="mt-14 flex flex-wrap justify-center gap-8 text-left">
            {events.map((event, index) => (
              <Reveal
                key={event.id}
                as="li"
                delayMs={index * 80}
                className="group relative w-full sm:w-[calc((100%-4rem)/3)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-200 shadow-sm transition-shadow duration-base ease-premium group-hover:shadow-xl">
                  {event.coverImageUrl ? (
                    <Image
                      src={event.coverImageUrl}
                      alt=""
                      fill
                      unoptimized={event.coverImageUrl.endsWith('.svg') || event.coverImageUrl.includes('placehold.co')}
                      sizes="(min-width: 640px) 33vw, 100vw"
                      className="object-cover transition-transform duration-slow ease-premium group-hover:scale-105"
                    />
                  ) : (
                    <div className="from-primary-700 to-primary-950 h-full w-full bg-gradient-to-br" />
                  )}
                </div>
                <p className="mt-6 text-sm font-semibold text-accent-600">
                  {formatInEventTimezone(event.startAt, event.timezone, DATE_OPTIONS)}
                  <span className="font-normal text-neutral-500">
                    {' '}
                    &middot; {formatInEventTimezone(event.startAt, event.timezone, TIME_OPTIONS)}
                  </span>
                </p>
                <h3 className="mt-1 font-semibold text-neutral-900">
                  {/* The whole card is clickable via this link's stretched hit area. */}
                  <Link
                    href={`/events/${event.slug}`}
                    className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary-950 focus-visible:after:ring-offset-4"
                  >
                    {event.title}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-neutral-600">
                  {event.city}, {event.state}
                </p>
                <span className="mt-3 inline-block border-b border-neutral-900/30 text-sm font-medium text-neutral-900 transition-colors group-hover:border-neutral-900">
                  Attend
                </span>
              </Reveal>
            ))}
          </ul>
        )}

        <Link
          href="/events"
          className="mt-12 inline-block border-b border-neutral-900/40 text-sm font-medium text-neutral-900 transition-colors duration-base ease-premium hover:border-neutral-900"
        >
          See all seminars
        </Link>
      </div>
    </section>
  );
}
