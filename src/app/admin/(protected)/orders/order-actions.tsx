'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

async function postJson(url: string, body?: unknown): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? 'Request failed');
  }
}

function ActionButton({
  label,
  confirmMessage,
  onRun,
  className = 'text-primary-950 underline',
}: {
  label: string;
  confirmMessage?: string;
  onRun: () => Promise<void>;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setPending(true);
    setError(null);
    try {
      await onRun();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-block">
      <button type="button" disabled={pending} onClick={handleClick} className={`${className} disabled:opacity-50`}>
        {pending ? '…' : label}
      </button>
      {error ? <span className="ml-2 text-xs text-red-700">{error}</span> : null}
    </span>
  );
}

export function RefundOrderButton({ orderId }: { orderId: string }) {
  return (
    <ActionButton
      label="Refund"
      confirmMessage="Refund this order in full? This cannot be undone."
      onRun={() => postJson(`/api/admin/orders/${orderId}/refund`)}
    />
  );
}

export function ResendConfirmationButton({ registrationId }: { registrationId: string }) {
  return <ActionButton label="Resend confirmation" onRun={() => postJson(`/api/admin/registrations/${registrationId}/resend`)} />;
}

export function CancelRegistrationButton({ registrationId }: { registrationId: string }) {
  return (
    <ActionButton
      label="Cancel"
      confirmMessage="Cancel this registration? The attendee will be notified."
      onRun={() => postJson(`/api/admin/registrations/${registrationId}/cancel`)}
    />
  );
}

export function MarkAttendedButton({ registrationId }: { registrationId: string }) {
  return <ActionButton label="Mark attended" onRun={() => postJson(`/api/admin/registrations/${registrationId}/mark-attended`)} />;
}

export function AttendeeNoteForm({ attendeeId, initialNote }: { attendeeId: string; initialNote: string }) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await postJson(`/api/admin/attendees/${attendeeId}/notes`, { note });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save note');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2">
      <label className="sr-only" htmlFor={`note-${attendeeId}`}>
        Internal note
      </label>
      <textarea
        id={`note-${attendeeId}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="w-full min-w-[200px] rounded-md border border-neutral-300 px-2 py-1 text-sm"
      />
      <button type="submit" disabled={pending} className="rounded-md bg-neutral-200 px-3 py-1 text-sm disabled:opacity-50">
        {pending ? 'Saving…' : 'Save'}
      </button>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </form>
  );
}
