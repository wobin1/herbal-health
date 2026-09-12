import Image from 'next/image';

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
        <h2
          id="benefits-heading"
          className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl"
        >
          <span className="block">{heading.line1}</span>
          <span className="block">{heading.line2}</span>
        </h2>

        <ul className="mt-14 grid gap-8 text-left sm:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-200">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <h3 className="mt-6 font-semibold text-neutral-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
