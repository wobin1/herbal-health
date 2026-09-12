import Link from 'next/link';
import type { Metadata } from 'next';
import { getPublishedFaqs } from '@/server/services/content-service';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: 'Answers to common questions about the Herbal Health Seminar Series.',
};

export default async function FaqPage() {
  const faqs = await getPublishedFaqs();

  return (
    <article className="mx-auto max-w-5xl px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
        Frequently Asked Questions
      </h1>
      <p className="mt-3 text-neutral-600">
        Can&apos;t find what you&apos;re looking for?{' '}
        <Link href="/contact" className="text-primary-700 font-medium underline">
          Contact us
        </Link>
        .
      </p>

      {faqs.length > 0 ? (
        <dl className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {faqs.map((faq) => (
            <div key={faq.id} className="flex gap-4">
              <span
                aria-hidden="true"
                className="bg-primary-50 text-primary-700 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25h.008v.008H12v-.008z" />
                </svg>
              </span>
              <div>
                <dt className="font-semibold text-neutral-900">{faq.question}</dt>
                <dd className="mt-1 text-neutral-600">{faq.answer}</dd>
              </div>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-14 text-neutral-600">No questions have been published yet.</p>
      )}
    </article>
  );
}
