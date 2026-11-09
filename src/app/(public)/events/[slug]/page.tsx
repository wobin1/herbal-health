import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicEventBySlug, listAlternativeEvents } from '@/server/services/event-service';
import { getEventStatusCta } from '@/lib/events/status-cta';
import { getSeatsRemaining, isTicketPurchasable } from '@/lib/events/availability';
import { getTicketPurchaseState } from '@/lib/events/ticket-purchase';
import { TicketSelector } from '@/components/ticket-selector';
import { formatInEventTimezone } from '@/lib/events/event-time';

const EVENT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
};

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EventDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) return { title: 'Event not found' };
  return {
    title: event.seoTitle ?? event.title,
    description: event.seoMetaDescription ?? event.shortDescription,
    alternates: event.seoCanonicalUrl ? { canonical: event.seoCanonicalUrl } : undefined,
    openGraph: event.seoOgImageUrl
      ? { images: [{ url: event.seoOgImageUrl }] }
      : event.coverImageUrl
        ? { images: [{ url: event.coverImageUrl }] }
        : undefined,
  };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) notFound();

  const cta = getEventStatusCta(event.status);

  const now = new Date();
  const isSoldOut =
    (event.status === 'ON_SALE' || event.status === 'SOLD_OUT') &&
    event.ticketTypes.length > 0 &&
    event.ticketTypes.every((ticket) => getSeatsRemaining(ticket) === 0);
  const alternatives = isSoldOut ? await listAlternativeEvents(event, now) : [];
  const purchase = getTicketPurchaseState(event, now);
  // Only offer ticket types whose sales window is open; sold-out ones still show as "Sold out".
  const offeredTickets = event.ticketTypes.filter(
    (ticket) => getSeatsRemaining(ticket) === 0 || isTicketPurchasable(ticket, now),
  );

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.shortDescription,
    startDate: event.startAt.toISOString(),
    endDate: event.endAt ? event.endAt.toISOString() : undefined,
    eventStatus:
      event.status === 'CANCELLED'
        ? 'https://schema.org/EventCancelled'
        : event.status === 'COMPLETED'
          ? 'https://schema.org/EventScheduled'
          : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: event.location
      ? {
          '@type': 'Place',
          name: event.location.name,
          address: {
            '@type': 'PostalAddress',
            streetAddress: event.location.address,
            addressLocality: event.location.city,
            addressRegion: event.location.state,
            postalCode: event.location.postalCode ?? undefined,
            addressCountry: event.location.country,
          },
        }
      : {
          '@type': 'Place',
          name: `${event.city}, ${event.state}`,
        },
    image: event.coverImageUrl ? [event.coverImageUrl] : undefined,
    performer: event.instructors.map((link) => ({ '@type': 'Person', name: link.instructor.name })),
  };

  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <p className="text-sm text-neutral-600">{formatInEventTimezone(event.startAt, event.timezone, EVENT_DATE_OPTIONS)}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">{event.title}</h1>
      <p className="mt-4 text-neutral-600">{event.shortDescription}</p>

      {event.location ? (
        <p className="mt-2 text-neutral-600">
          {event.location.name}, {event.location.city}, {event.location.state}
        </p>
      ) : (
        <p className="mt-2 text-neutral-600">
          {event.city}, {event.state}
        </p>
      )}

      {purchase.canBuy ? (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-primary-950 px-5 py-4 text-neutral-50">
          <p className="text-sm">
            Tickets from <span className="text-base font-semibold">{purchase.fromPrice}</span>
          </p>
          <a
            href="#tickets"
            className="ml-auto inline-flex items-center rounded-full bg-neutral-50 px-6 py-2.5 text-sm font-semibold text-primary-950 transition-colors duration-fast ease-premium hover:bg-accent-500 hover:text-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-50"
          >
            Buy Tickets
          </a>
        </div>
      ) : null}

      {event.location ? (
        <section className="mt-6" aria-labelledby="map-heading">
          <h2 id="map-heading" className="sr-only">
            Venue map
          </h2>
          <iframe
            title={`Map showing ${event.location.name}`}
            src={`https://www.google.com/maps?q=${encodeURIComponent(
              `${event.location.address}, ${event.location.city}, ${event.location.state} ${event.location.postalCode ?? ''}`,
            )}&output=embed`}
            className="h-80 w-full rounded-lg border border-neutral-200"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          {event.location.mapUrl ? (
            <a
              href={event.location.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-950 mt-2 inline-block text-sm font-medium underline-offset-2 hover:underline"
            >
              Open in Google Maps
            </a>
          ) : null}
        </section>
      ) : null}

      {event.longDescription ? (
        <div className="mt-8 space-y-4 text-neutral-600">
          {event.longDescription.split(/\n{2,}/).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      ) : null}

      {event.whatYouWillLearn.length > 0 ? (
        <section className="mt-8" aria-labelledby="learn-heading">
          <h2 id="learn-heading" className="text-xl font-semibold text-neutral-900">
            What You Will Learn
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-neutral-600">
            {event.whatYouWillLearn.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {event.instructors.length > 0 ? (
        <section className="mt-8" aria-labelledby="instructors-heading">
          <h2 id="instructors-heading" className="text-xl font-semibold text-neutral-900">
            Instructors
          </h2>
          <ul className="mt-3 space-y-1 text-neutral-600">
            {event.instructors.map((link) => (
              <li key={link.id}>{link.instructor.name}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {event.ticketTypes.length > 0 || event.status === 'ON_SALE' ? (
        <section
          id="tickets"
          className="mt-12 scroll-mt-24 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8"
          aria-labelledby="tickets-heading"
        >
          <h2 id="tickets-heading" className="font-serif text-2xl font-semibold text-neutral-900">
            {purchase.canBuy ? 'Buy Tickets' : 'Tickets'}
          </h2>
          {purchase.canBuy ? (
            <p className="mt-1 text-sm text-neutral-600">Choose your ticket and continue to secure checkout.</p>
          ) : null}
          <div className="mt-5 text-neutral-600">
            {event.status === 'ON_SALE' && offeredTickets.length === 0 ? (
              <p>Tickets aren&apos;t available to buy yet. Please check back soon.</p>
            ) : event.status === 'ON_SALE' ? (
              <TicketSelector
                eventId={event.id}
                tickets={offeredTickets.map((ticket) => ({
                  id: ticket.id,
                  name: ticket.name,
                  priceMinorUnits: ticket.priceMinorUnits,
                  currency: ticket.currency,
                  seatsRemaining: getSeatsRemaining(ticket),
                }))}
              />
            ) : (
              <ul className="space-y-2">
                {event.ticketTypes.map((ticket) => (
                  <li key={ticket.id} className="flex items-center justify-between gap-4">
                    <span>
                      {ticket.name} —{' '}
                      {(ticket.priceMinorUnits / 100).toLocaleString('en-US', {
                        style: 'currency',
                        currency: ticket.currency,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {isSoldOut ? (
            <div role="status" className="mt-6 rounded-lg border border-neutral-200 p-4">
              <h3 className="font-semibold text-neutral-900">This event is sold out</h3>
              {alternatives.length > 0 ? (
                <>
                  <p className="mt-1 text-neutral-600">
                    Other upcoming events in {event.city}, {event.state} with seats available:
                  </p>
                  <ul className="mt-3 space-y-2">
                    {alternatives.map((alt) => (
                      <li key={alt.id}>
                        <Link
                          href={`/events/${alt.slug}`}
                          className="text-primary-950 focus-visible:outline-primary-950 font-medium underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2"
                        >
                          {alt.title}
                        </Link>
                        <span className="block text-sm text-neutral-600">
                          {formatInEventTimezone(alt.startAt, alt.timezone, EVENT_DATE_OPTIONS)}
                          {alt.location ? ` · ${alt.location.name}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-1 text-neutral-600">
                  There are no other upcoming events with available seats in {event.city} right now.
                </p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {cta.label && !cta.ctaEnabled ? (
        <p className="mt-10 font-medium text-neutral-600">{cta.label}</p>
      ) : null}
    </article>
  );
}
