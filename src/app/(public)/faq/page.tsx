import type { Metadata } from 'next';
import { getPublishedFaqs } from '@/server/services/content-service';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: 'Answers to common questions about the Herbal Health Seminar Series.',
};

export default async function FaqPage() {
  const faqs = await getPublishedFaqs();

  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
        Frequently Asked Questions
      </h1>
      {faqs.length > 0 ? (
        <dl className="mt-10 space-y-6">
          {faqs.map((faq) => (
            <div key={faq.id}>
              <dt className="font-semibold text-neutral-900">{faq.question}</dt>
              <dd className="mt-1 text-neutral-600">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-6 text-neutral-600">No questions have been published yet.</p>
      )}
    </article>
  );
}
