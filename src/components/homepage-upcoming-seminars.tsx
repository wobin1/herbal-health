import Image from 'next/image';
import Link from 'next/link';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

interface UpcomingSeminarEvent {
  id: string;
  slug: string;
  title: string;
  city: string;
  state: string;
  startAt: Date;
}

export function HomepageUpcomingSeminars({ events }: { events: UpcomingSeminarEvent[] }) {
  return (
    <section className="bg-primary-950 relative overflow-hidden" aria-labelledby="events-heading">
      <div className="absolute inset-0">
        <Image
          src="/images/seminars-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="bg-primary-950/80 absolute inset-0" />
        <div className="from-primary-950 via-primary-950/70 absolute inset-0 bg-gradient-to-r to-transparent" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center">
        <div>
          <p className="text-accent-500/90 text-sm font-semibold tracking-[0.2em] uppercase">
            Get Involved
          </p>
          <h2
            id="events-heading"
            className="font-serif mt-3 text-3xl font-semibold leading-tight text-neutral-50 sm:text-4xl"
          >
            Upcoming Seminars.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-50/80">
            Join Dr. Goodman&apos;s traveling workshops near you. Learn practical herbal
            preparation, wellness fundamentals, and time-tested remedies alongside a community of
            curious learners.
          </p>
          <Link
            href="/events"
            className="border-neutral-50/40 text-neutral-50/90 hover:border-neutral-50 hover:text-neutral-50 mt-6 inline-block border-b text-sm font-medium transition-colors"
          >
            See all seminars
          </Link>
        </div>

        <ul className="divide-neutral-50/15 divide-y border-neutral-50/15 lg:border-t lg:border-b">
          {events.map((event) => (
            <li key={event.id} className="flex items-center justify-between gap-4 py-5">
              <div>
                <p className="text-accent-500/90 text-sm font-semibold">
                  {DATE_FORMATTER.format(event.startAt)}
                  <span className="text-neutral-50/60 font-normal"> &middot; {TIME_FORMATTER.format(event.startAt)}</span>
                </p>
                <h3 className="mt-1 font-semibold text-neutral-50">{event.title}</h3>
                <p className="mt-1 text-sm text-neutral-50/70">
                  {event.city}, {event.state}
                </p>
              </div>
              <Link
                href={`/events/${event.slug}`}
                className="border-neutral-50/50 text-neutral-50 hover:bg-neutral-50 hover:text-primary-950 inline-flex shrink-0 items-center justify-center rounded-full border px-5 py-2 text-sm font-medium transition-colors"
              >
                Attend
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
