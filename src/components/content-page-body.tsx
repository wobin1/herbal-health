export function ContentPageBody({ title, body }: { title: string; body: string }) {
  const paragraphs = body.split(/\n{2,}/).filter(Boolean);

  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">{title}</h1>
      <div className="mt-6 space-y-4 text-neutral-600">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
