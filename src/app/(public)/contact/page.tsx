import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactForm } from '@/components/contact-form';
import { PageHero } from '@/components/page-hero';
import { getContentPage, getHomepageContent } from '@/server/services/content-service';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentPage('CONTACT');
  return { title: page?.title ?? 'Contact', description: page?.metaDescription ?? undefined };
}

export default async function ContactPage() {
  const [page, homepageContent] = await Promise.all([getContentPage('CONTACT'), getHomepageContent()]);
  if (!page) notFound();

  const paragraphs = page.body.split(/\n{2,}/).filter(Boolean);
  const [intro, ...rest] = paragraphs;

  return (
    <article>
      <PageHero
        badge="Herbal Health Seminar Series"
        heading={page.title}
        description={intro}
        imageSrc="https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=2000&auto=format&fit=crop"
      />

      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mt-10">
              <ContactForm />
            </div>

            {rest.length > 0 ? (
              <div className="mt-10 space-y-4 text-sm text-neutral-600">
                {rest.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="bg-primary-950 h-fit rounded-2xl p-8 text-neutral-50">
            <h2 className="text-xl font-semibold">Find a Seminar</h2>
            <p className="mt-3 text-sm text-neutral-50/70">
              We host seminars in cities across the country, not from a single office.
            </p>
            <Link
              href="/events"
              className="mt-3 inline-block text-sm font-medium text-neutral-50 underline decoration-neutral-50/40 underline-offset-4 hover:decoration-neutral-50"
            >
              See upcoming seminar locations
            </Link>

            <div className="mt-10">
              <h2 className="text-xl font-semibold">Contact</h2>
              <dl className="mt-3 space-y-1 text-sm text-neutral-50/70">
                {homepageContent.footerContactPhone ? (
                  <div>
                    <dt className="inline">Phone: </dt>
                    <dd className="inline text-neutral-50">{homepageContent.footerContactPhone}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="inline">Email: </dt>
                  <dd className="inline">
                    <a
                      href={`mailto:${homepageContent.footerContactEmail}`}
                      className="text-neutral-50 underline decoration-neutral-50/40 underline-offset-4 hover:decoration-neutral-50"
                    >
                      {homepageContent.footerContactEmail}
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}
