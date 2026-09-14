'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/confirm-dialog';
import { ButtonSpinner } from '@/components/admin/ui';
import { toastError, toastSuccess } from '@/components/toast/use-toast';

export function EventDeleteButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!(await confirm('Delete this event? This cannot be undone.'))) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.error?.message ?? 'Unable to delete event';
        setError(message);
        toastError('Delete failed', message);
        return;
      }
      toastSuccess('Event deleted');
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="inline-flex items-center gap-1.5 font-medium text-red-700 underline-offset-2 transition-opacity duration-fast ease-premium hover:underline disabled:opacity-50"
      >
        {deleting ? <ButtonSpinner className="h-3.5 w-3.5" /> : null}
        Delete
      </button>
      {error ? <span className="ml-2 text-xs text-red-600">{error}</span> : null}
      {dialog}
    </>
  );
}
