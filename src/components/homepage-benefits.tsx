import { CertificateIcon, HandHeartIcon, ShieldCheckIcon } from '@/components/icons';
import type { ComponentType, SVGProps } from 'react';

const ICONS_BY_KEY: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  shield: ShieldCheckIcon,
  heart: HandHeartIcon,
  certificate: CertificateIcon,
};

export function HomepageBenefits({
  heading,
  items,
}: {
  heading: { line1: string; line2: string };
  items: Array<{ id: string; icon: string; title: string; description: string }>;
}) {
  return (
    <section className="bg-neutral-50 py-24" aria-labelledby="benefits-heading">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h2
          id="benefits-heading"
          className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl"
        >
          <span className="block">{heading.line1}</span>
          <span className="block">{heading.line2}</span>
        </h2>

        <ul className="mt-14 grid gap-6 text-left sm:grid-cols-3">
          {items.map((item) => {
            const Icon = ICONS_BY_KEY[item.icon] ?? ShieldCheckIcon;
            return (
              <li
                key={item.id}
                className="rounded-2xl border border-neutral-100 bg-neutral-50 p-8 shadow-[0_1px_2px_rgba(20,32,26,0.04)] transition-shadow hover:shadow-md"
              >
                <span className="bg-primary-600/10 text-primary-600 flex h-14 w-14 items-center justify-center rounded-full">
                  <Icon className="h-7 w-7" />
                </span>
                <h3 className="mt-6 font-semibold text-neutral-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{item.description}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
