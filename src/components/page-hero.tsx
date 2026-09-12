import Image from 'next/image';

export function PageHero({
  badge,
  heading,
  description,
  imageSrc,
}: {
  badge: string;
  heading: string;
  description?: string;
  imageSrc: string;
}) {
  return (
    <section className="bg-primary-950 relative overflow-hidden pb-28 pt-20 text-neutral-50 sm:pt-24">
      <Image src={imageSrc} alt="" fill priority sizes="100vw" className="object-cover" />
      <div aria-hidden="true" className="from-primary-950 via-primary-950/85 absolute inset-0 bg-gradient-to-r to-transparent" />
      <div
        aria-hidden="true"
        className="from-primary-700/40 pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] to-transparent"
      />
      <div className="animate-fade-in-up relative mx-auto max-w-6xl px-6">
        <span className="inline-flex items-center rounded-full border border-neutral-50/20 bg-neutral-50/5 px-4 py-1 text-xs font-medium uppercase tracking-widest text-neutral-50/80">
          {badge}
        </span>
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">{heading}</h1>
        {description ? <p className="mt-4 max-w-xl text-neutral-50/70">{description}</p> : null}
      </div>
    </section>
  );
}
