import Link from 'next/link';

export function PaginationControls({
  page,
  totalPages,
  total,
  basePath,
  searchParams = {},
}: {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  function hrefFor(targetPage: number): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.set('page', String(targetPage));
    return `${basePath}?${params.toString()}`;
  }

  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
      <p className="text-neutral-600">
        Page {page} of {totalPages} ({total} total)
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={hrefFor(page - 1)}
            className="rounded-full border border-neutral-300 px-4 py-2 font-medium text-neutral-700 transition-colors duration-fast ease-premium hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Previous
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="rounded-full border border-neutral-200 px-4 py-2 font-medium text-neutral-400"
          >
            Previous
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={hrefFor(page + 1)}
            className="rounded-full border border-neutral-300 px-4 py-2 font-medium text-neutral-700 transition-colors duration-fast ease-premium hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Next
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="rounded-full border border-neutral-200 px-4 py-2 font-medium text-neutral-400"
          >
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
