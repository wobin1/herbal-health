'use client';

import { useEffect } from 'react';
import { AlertTriangleIcon } from '@/components/admin/icons';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/60 px-6 py-16 text-center">
      <div className="rounded-full bg-red-50 p-3 text-red-600">
        <AlertTriangleIcon className="h-7 w-7" />
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-900">Something went wrong</p>
        <p className="mt-1 text-sm text-neutral-500">
          The page couldn&apos;t load. You can try again, or come back in a moment.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-primary-950 px-5 py-2 text-sm font-medium text-neutral-50 transition-colors hover:bg-primary-900"
      >
        Try again
      </button>
    </div>
  );
}
