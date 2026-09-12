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
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 75% at 18% 50%, rgba(13,31,22,0.75) 0%, rgba(13,31,22,0.35) 55%, rgba(13,31,22,0) 80%)',
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-6 py-16">
        <div className="animate-fade-in-up flex max-w-xl flex-col items-start">
          <p className="text-accent-500/90 text-sm font-semibold tracking-[0.2em] uppercase">
            {eyebrow}
          </p>
          <h1 className="font-serif mt-3 flex flex-col leading-[1.05] font-semibold tracking-tight text-neutral-50">
            <span className="text-4xl sm:text-5xl lg:text-6xl">{headingLine1}</span>
            <span className="text-4xl sm:text-5xl lg:text-6xl">{headingLine2}</span>
            <span className="text-neutral-50/75 mt-1 text-xl italic sm:text-2xl lg:text-3xl">
              {headingLine3}
            </span>
          </h1>
          <p className="text-neutral-50/85 mt-6 max-w-md text-sm leading-relaxed">
            Empowering wellness through traditional herbal wisdom. Join our traveling educational
            workshops to learn the fundamentals of herbal preparation and wellness.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href={ctaHref}
              className="group inline-flex items-center gap-3 rounded-full bg-neutral-50 py-2 pr-2 pl-6 text-sm font-semibold text-neutral-900 shadow-lg transition-transform duration-base ease-premium hover:scale-[1.02]"
            >
              {ctaLabel}
              <span className="bg-accent-500 flex h-9 w-9 items-center justify-center rounded-full text-neutral-50 transition-transform duration-base ease-premium group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRightIcon className="h-4 w-4" />
              </span>
            </Link>
            <Link
              href="/about"
              className="text-neutral-50/80 hover:text-neutral-50 border-neutral-50/40 hover:border-neutral-50 border-b text-sm font-medium transition-colors duration-base ease-premium"
            >
              Meet Dr. Goodman
            </Link>
          </div>
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
