import Link from 'next/link';
import {
  getHomepageContent,
  getPublishedEducationalFocusItems,
  getFeaturedEvents,
  getFeaturedInstructors,
  getPublishedFaqs,
} from '@/server/services/content-service';
import { HomepageHero } from '@/components/homepage-hero';
import { HomepageBenefits } from '@/components/homepage-benefits';

const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

export default async function HomePage() {
  const [content, focusItems, events, instructors, faqs] = await Promise.all([
    getHomepageContent(),
    getPublishedEducationalFocusItems(),
    getFeaturedEvents(),
    getFeaturedInstructors(),
    getPublishedFaqs(),
  ]);

  return (
    <>
      <HomepageHero
        eyebrow="#1 Herbal Health Seminar Series"
        headingLine1="Herbal Health"
        headingLine2="Seminar Series"
        headingLine3="with Dr. JC Goodman, N.D."
        ctaLabel={content.heroCtaLabel}
        ctaHref={content.heroCtaHref}
      />

      <HomepageBenefits
        heading={{ line1: 'Practical Knowledge For', line2: 'Everyday Herbal Wellness' }}
        items={focusItems}
      />

      <section className="bg-neutral-50 py-20" aria-labelledby="mission-heading">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 id="mission-heading" className="text-2xl font-semibold text-neutral-900 sm:text-3xl">
            {content.missionHeading}
          </h2>
          <p className="mt-4 text-neutral-600">{content.missionBody}</p>
        </div>
      </section>

      {events.length > 0 ? (
        <section className="bg-neutral-50 py-20" aria-labelledby="events-heading">
          <div className="mx-auto max-w-6xl px-6">
            <h2 id="events-heading" className="text-center text-2xl font-semibold text-neutral-900 sm:text-3xl">
              Upcoming Seminars
            </h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-3">
              {events.map((event) => (
                <li key={event.id} className="rounded-lg border border-neutral-100 p-6">
                  <p className="text-sm text-neutral-600">
                    {EVENT_DATE_FORMATTER.format(event.startAt)} &middot; {event.city}, {event.state}
                  </p>
                  <h3 className="mt-2 font-semibold text-neutral-900">{event.title}</h3>
                  <p className="mt-2 text-sm text-neutral-600">{event.shortDescription}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {instructors.length > 0 ? (
        <section className="bg-neutral-100 py-20" aria-labelledby="instructors-heading">
          <div className="mx-auto max-w-6xl px-6">
            <h2
              id="instructors-heading"
              className="text-center text-2xl font-semibold text-neutral-900 sm:text-3xl"
            >
              Meet Your Instructors
            </h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-3">
              {instructors.map((instructor) => (
                <li key={instructor.id} className="rounded-lg bg-neutral-50 p-6 text-center shadow-sm">
                  <h3 className="font-semibold text-neutral-900">{instructor.name}</h3>
                  {instructor.credentials ? (
                    <p className="text-sm text-neutral-600">{instructor.credentials}</p>
                  ) : null}
                  <p className="mt-2 text-sm text-neutral-600">{instructor.shortBio}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {faqs.length > 0 ? (
        <section className="bg-neutral-50 py-20" aria-labelledby="faq-heading">
          <div className="mx-auto max-w-3xl px-6">
            <h2 id="faq-heading" className="text-center text-2xl font-semibold text-neutral-900 sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <dl className="mt-10 space-y-6">
              {faqs.map((faq) => (
                <div key={faq.id}>
                  <dt className="font-semibold text-neutral-900">{faq.question}</dt>
                  <dd className="mt-1 text-neutral-600">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}

      <section className="bg-primary-900 text-neutral-50" aria-labelledby="final-cta-heading">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-20 text-center">
          <h2 id="final-cta-heading" className="text-2xl font-semibold sm:text-3xl">
            {content.finalCtaHeading}
          </h2>
          <p className="text-neutral-100/85">{content.finalCtaBody}</p>
          <Link
            href={content.finalCtaHref}
            className="bg-accent-500 hover:bg-accent-600 inline-block rounded-full px-6 py-3 text-sm font-semibold text-neutral-50"
          >
            {content.finalCtaLabel}
          </Link>
        </div>
      </section>
    </>
  );
}
