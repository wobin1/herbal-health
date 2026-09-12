import Image from 'next/image';

export function ContentPageBody({
  title,
  body,
  imageSrc,
  imageAlt,
  missionText,
}: {
  title: string;
  body: string;
  imageSrc?: string;
  imageAlt?: string;
  missionText?: string;
}) {
  const paragraphs = body.split(/\n{2,}/).filter(Boolean);
  const missionParagraphs = missionText?.split(/\n{2,}/).filter(Boolean) ?? [];

  return (
    <article className="animate-fade-in-up mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">{title}</h1>
      {imageSrc && (
        <Image
          src={imageSrc}
          alt={imageAlt ?? ''}
          width={320}
          height={320}
          className="mt-6 h-40 w-40 rounded-full object-cover"
          priority
        />
      )}
      <div className="mt-6 space-y-4 text-neutral-600">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      {missionParagraphs.length > 0 && (
        <div className="mt-12 border-t border-neutral-200 pt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">Our Mission</h2>
          <div className="mt-4 space-y-4 text-neutral-600">
            {missionParagraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
