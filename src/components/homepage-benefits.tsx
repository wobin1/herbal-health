import Image from 'next/image';
import { Reveal } from '@/components/motion/reveal';
import { LeafMarkIcon } from '@/components/icons';

export function HomepageBenefits({
  heading,
  items,
}: {
  heading: { line1: string; line2: string };
  items: Array<{ id: string; icon: string; title: string; description: string; imageUrl?: string | null }>;
}) {
  return (
    <section className="bg-neutral-50 py-24" aria-labelledby="benefits-heading">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <Reveal>
          <h2
            id="benefits-heading"
            className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl"
          >
            <span className="block">{heading.line1}</span>
            <span className="block">{heading.line2}</span>
          </h2>
        </Reveal>

        {items.length === 0 ? (
          <div className="mt-14 flex flex-col items-center gap-4 rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="text-primary-700 ring-primary-700/15 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 ring-1 ring-inset">
              <LeafMarkIcon className="h-7 w-7" />
            </div>
            <div className="max-w-sm">
              <p className="text-base font-semibold text-neutral-900">Focus areas coming soon</p>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
                We&apos;re putting together what you&apos;ll learn in our seminars — check back shortly.
              </p>
            </div>
          </div>
        ) : (
        <ul className="mt-14 grid gap-8 text-left sm:grid-cols-3">
          {items.map((item, index) => (
            <Reveal key={item.id} as="li" delayMs={index * 80} className="group">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-200 shadow-sm transition-shadow duration-base ease-premium group-hover:shadow-xl">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="object-cover transition-transform duration-slow ease-premium group-hover:scale-105"
                  />
                ) : null}
              </div>
              <h3 className="mt-6 font-semibold text-neutral-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{item.description}</p>
            </Reveal>
          ))}
        </ul>
        )}
      </div>
    </section>
  );
}
