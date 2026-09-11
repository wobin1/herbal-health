import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicEventBySlug } from '@/server/services/event-service';
import { getEventStatusCta } from '@/lib/events/status-cta';

const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'UTC',
});

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
      <p className="text-sm text-neutral-600">{EVENT_DATE_FORMATTER.format(event.startAt)}</p>
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

      {event.ticketTypes.length > 0 ? (
        <section className="mt-8" aria-labelledby="tickets-heading">
          <h2 id="tickets-heading" className="text-xl font-semibold text-neutral-900">
            Tickets
          </h2>
          <ul className="mt-3 space-y-2 text-neutral-600">
            {event.ticketTypes.map((ticket) => (
              <li key={ticket.id}>
                {ticket.name} — {(ticket.priceMinorUnits / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: ticket.currency,
                })}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {cta.label ? (
        <p className="mt-10">
          <span
            className={
              cta.ctaEnabled
                ? 'inline-block rounded-full bg-primary-950 px-6 py-3 text-sm font-medium text-neutral-50'
                : 'inline-block rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-500'
            }
          >
            {cta.label}
          </span>
        </p>
      ) : null}
    </article>
  );
}
