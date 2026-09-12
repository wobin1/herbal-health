import Link from 'next/link';
import { ArrowUpRightIcon } from '@/components/icons';
import {
  getHomepageContent,
  getPublishedEducationalFocusItems,
  getFeaturedEvents,
} from '@/server/services/content-service';
import { FAQ_ITEMS } from '@/lib/content/static-pages';
import { HomepageHero } from '@/components/homepage-hero';
import { HomepageBenefits } from '@/components/homepage-benefits';
import { HomepageUpcomingSeminars } from '@/components/homepage-upcoming-seminars';

export default async function HomePage() {
  const [content, focusItems, events] = await Promise.all([
    getHomepageContent(),
    getPublishedEducationalFocusItems(),
    getFeaturedEvents(),
  ]);
  const faqs = FAQ_ITEMS;

  return (
    <>
      <HomepageHero
        eyebrow="Rooted in Nature, Backed by Wisdom"
        headingLine1="Herbal Health"
        headingLine2="Seminar Series"
        headingLine3="with Dr. JC Goodman, N.D."
        ctaLabel={content.heroCtaLabel}
        ctaHref={content.heroCtaHref}
      />

      <HomepageBenefits
        heading={{ line1: 'Practical Knowledge For', line2: 'Everyday Herbal Wellness' }}
        items={focusItems.slice(0, 6)}
      />

      <HomepageUpcomingSeminars events={events} />

      {faqs.length > 0 ? (
        <section className="bg-neutral-50 py-24" aria-labelledby="faq-heading">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <p className="text-primary-700/90 text-sm font-semibold tracking-[0.2em] uppercase">
              Common Questions
            </p>
            <h2
              id="faq-heading"
              className="font-serif mt-3 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl"
            >
              Frequently Asked Questions
            </h2>
            <dl className="mt-14 space-y-8 text-left">
              {faqs.slice(0, 3).map((faq) => (
                <div key={faq.id} className="border-b border-neutral-200 pb-8 last:border-b-0">
                  <dt className="font-semibold text-neutral-900">{faq.question}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-neutral-600">{faq.answer}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-10">
              <Link
                href="/faq"
                className="border-primary-600 text-primary-700 hover:bg-primary-50 inline-block rounded-full border px-6 py-3 text-sm font-semibold transition-colors"
              >
                See all FAQs
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-primary-950 relative overflow-hidden text-neutral-50" aria-labelledby="final-cta-heading">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 75% at 50% 30%, rgba(13,31,22,0.4) 0%, rgba(13,31,22,0) 70%)',
          }}
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-24 text-center">
          <p className="text-accent-500/90 text-sm font-semibold tracking-[0.2em] uppercase">
            Join Us
          </p>
          <h2
            id="final-cta-heading"
            className="font-serif mt-1 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {content.finalCtaHeading}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-50/85">
            {content.finalCtaBody}
          </p>
          <Link
            href={content.finalCtaHref}
            className="group mt-6 inline-flex items-center gap-3 rounded-full bg-neutral-50 py-2 pr-2 pl-6 text-sm font-semibold text-neutral-900 shadow-lg transition-transform hover:scale-[1.02]"
          >
            {content.finalCtaLabel}
            <span className="bg-accent-500 flex h-9 w-9 items-center justify-center rounded-full text-neutral-50 transition-colors">
              <ArrowUpRightIcon className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
