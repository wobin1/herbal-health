import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRightIcon, ChevronDownIcon } from '@/components/icons';

export function HomepageHero({
  eyebrow,
  headingLine1,
  headingLine2,
  headingLine3,
  ctaLabel,
  ctaHref,
}: {
  eyebrow: string;
  headingLine1: string;
  headingLine2: string;
  headingLine3: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <section className="bg-primary-950 relative flex min-h-[100svh] items-center overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/hero-mortar-pestle.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-x-[-1] object-cover"
        />
        <div className="bg-primary-950/70 absolute inset-0" />
        <div className="from-primary-950 via-primary-950/60 absolute inset-0 bg-gradient-to-r to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-6 py-16">
        <div className="flex max-w-xl flex-col items-start gap-6">
          <p className="text-sm font-semibold tracking-wide text-neutral-50 uppercase">{eyebrow}</p>
          <h1 className="flex flex-col leading-[1.05] font-extrabold tracking-tight text-neutral-50">
            <span className="text-4xl sm:text-5xl lg:text-6xl">{headingLine1}</span>
            <span className="text-4xl sm:text-5xl lg:text-6xl">{headingLine2}</span>
            <span
              className="mt-1 text-xl text-transparent sm:text-2xl lg:text-3xl"
              style={{ WebkitTextStroke: '1px var(--color-neutral-50)' }}
            >
              {headingLine3}
            </span>
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-neutral-50/90">
            Empowering wellness through traditional herbal wisdom. Join our traveling educational
            workshops to learn the fundamentals of herbal preparation and wellness.
          </p>
          <Link
            href={ctaHref}
            className="group inline-flex items-center gap-3 rounded-full bg-neutral-50 py-2 pr-2 pl-6 text-sm font-semibold text-neutral-900 shadow-lg transition-transform hover:scale-[1.02]"
          >
            {ctaLabel}
            <span className="bg-accent-500 flex h-9 w-9 items-center justify-center rounded-full text-neutral-50 transition-colors">
              <ArrowUpRightIcon className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-50/40 bg-neutral-50/10 text-neutral-50 backdrop-blur">
          <ChevronDownIcon className="h-5 w-5" />
        </span>
      </div>
    </section>
  );
}
