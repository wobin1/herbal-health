import Image from 'next/image';
import { Reveal } from '@/components/motion/reveal';
import { LeafMarkIcon } from '@/components/icons';

/** Dark photo-backed section with a divided list (the layout that follows the first section). */
export function HomepageBenefits({
  heading,
  items,
}: {
  heading: { line1: string; line2: string };
  items: Array<{ id: string; icon: string; title: string; description: string; imageUrl?: string | null }>;
}) {
  return (
    <section className="bg-primary-950 relative overflow-hidden" aria-labelledby="benefits-heading">
      <div className="absolute inset-0">
        <Image src="/images/seminars-bg.jpg" alt="" fill sizes="100vw" className="object-cover" />
        <div className="bg-primary-950/80 absolute inset-0" />
        <div className="from-primary-950 via-primary-950/70 absolute inset-0 bg-gradient-to-r to-transparent" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center">
        <Reveal>
          <p className="text-accent-500/90 text-sm font-semibold tracking-[0.2em] uppercase">What You&apos;ll Learn</p>
          <h2
            id="benefits-heading"
            className="font-serif mt-3 text-3xl font-semibold leading-tight text-neutral-50 sm:text-4xl"
          >
            <span className="block">{heading.line1}</span>
            <span className="block">{heading.line2}</span>
          </h2>
        </Reveal>

        {items.length === 0 ? (
          <div className="border-neutral-50/15 flex flex-col items-center gap-4 border-t border-b px-4 py-14 text-center lg:py-0">
            <div className="text-neutral-50/80 ring-neutral-50/20 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-50/10 ring-1 ring-inset">
              <LeafMarkIcon className="h-6 w-6" />
            </div>
            <div className="max-w-xs">
              <p className="font-semibold text-neutral-50">Focus areas coming soon</p>
              <p className="text-neutral-50/70 mt-1.5 text-sm leading-relaxed">
                We&apos;re putting together what you&apos;ll learn in our seminars — check back shortly.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-neutral-50/15 divide-y border-neutral-50/15 lg:border-t lg:border-b">
            {items.map((item, index) => (
              <Reveal key={item.id} as="li" delayMs={index * 80} className="flex items-center gap-4 py-5 sm:gap-5">
                <div className="ring-neutral-50/15 relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-primary-900 ring-1 sm:h-20 sm:w-28">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt="" fill sizes="112px" className="object-cover" />
                  ) : (
                    <div className="from-primary-700 to-primary-950 h-full w-full bg-gradient-to-br" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-neutral-50">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-50/70">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
