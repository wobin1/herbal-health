'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/confirm-dialog';

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
        setError(data?.error?.message ?? 'Unable to delete event');
        return;
      }
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
        className="font-medium text-red-700 underline-offset-2 hover:underline disabled:opacity-50"
      >
        Delete
      </button>
      {error ? <span className="ml-2 text-xs text-red-600">{error}</span> : null}
      {dialog}
    </>
  );
}
