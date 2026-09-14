'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ButtonSpinner,
  EmptyState,
  rowActionsClassName,
  tableClassName,
  tableShellClassName,
  tdClassName,
  tdNumClassName,
  tdPrimaryClassName,
  theadClassName,
  thClassName,
  thNumClassName,
  trClassName,
} from '@/components/admin/ui';
import { ReceiptIcon } from '@/components/admin/icons';
import { toastError, toastSuccess } from '@/components/toast/use-toast';

export interface TicketTypeRow {
  id: string;
  name: string;
  priceMinorUnits: number;
  currency: string;
  capacity: number;
}

const EMPTY = { name: '', price: '', capacity: '' };

function formatPrice(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minorUnits / 100);
}

export function TicketTypeManager({ eventId, ticketTypes }: { eventId: string; ticketTypes: TicketTypeRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function startEdit(ticketType: TicketTypeRow) {
    setEditingId(ticketType.id);
    setForm({
      name: ticketType.name,
      price: (ticketType.priceMinorUnits / 100).toString(),
      capacity: ticketType.capacity.toString(),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const priceMinorUnits = Math.round(Number(form.price) * 100);
      const capacity = Number(form.capacity);
      if (!Number.isFinite(priceMinorUnits) || priceMinorUnits < 0) {
        setError('Enter a valid price');
        return;
      }
      if (!Number.isInteger(capacity) || capacity < 0) {
        setError('Enter a valid capacity');
        return;
      }

      const payload = { name: form.name, priceMinorUnits, capacity, currency: 'USD' };
      const url = editingId
        ? `/api/admin/events/${eventId}/ticket-types/${editingId}`
        : `/api/admin/events/${eventId}/ticket-types`;
      const response = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = data.error?.message ?? 'Unable to save ticket type';
        setError(message);
        toastError('Unable to save ticket type', message);
        return;
      }
      resetForm();
      toastSuccess('Ticket type saved');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/ticket-types/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.error?.message ?? 'Unable to delete ticket type';
        setError(message);
        toastError('Unable to delete ticket type', message);
        return;
      }
      if (editingId === id) resetForm();
      toastSuccess('Ticket type deleted');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {ticketTypes.length === 0 ? (
        <EmptyState
          compact
          icon={<ReceiptIcon className="h-5 w-5" />}
          title="No ticket types yet"
          description="Add a ticket type below to start selling for this event."
        />
      ) : (
        <div className={`${tableShellClassName} overflow-x-auto`}>
          <table className={`${tableClassName} min-w-[500px]`}>
            <thead className={theadClassName}>
              <tr className="border-b border-neutral-200">
                <th scope="col" className={thClassName}>Name</th>
                <th scope="col" className={thNumClassName}>Price</th>
                <th scope="col" className={thNumClassName}>Capacity</th>
                <th scope="col" className={thClassName}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ticketTypes.map((ticketType) => (
                <tr key={ticketType.id} className={trClassName}>
                  <td className={tdPrimaryClassName}>{ticketType.name}</td>
                  <td className={tdNumClassName}>{formatPrice(ticketType.priceMinorUnits, ticketType.currency)}</td>
                  <td className={tdNumClassName}>{ticketType.capacity}</td>
                  <td className={tdClassName}>
                    <div className={rowActionsClassName}>
                      <button
                        type="button"
                        onClick={() => startEdit(ticketType)}
                        className="text-sm font-medium text-primary-950 underline-offset-2 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(ticketType.id)}
                        disabled={submitting}
                        className="text-sm font-medium text-red-700 underline-offset-2 transition-opacity duration-fast ease-premium hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 grid gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:grid-cols-3">
        <h3 className="text-base font-semibold text-neutral-900 sm:col-span-3">
          {editingId ? 'Edit Ticket Type' : 'Add Ticket Type'}
        </h3>
        {error ? (
          <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 sm:col-span-3">
            {error}
          </p>
        ) : null}
        <div>
          <label htmlFor="ticket-name" className="block text-sm font-medium text-neutral-900">
            Name<span aria-hidden="true"> *</span>
          </label>
          <input
            id="ticket-name"
            type="text"
            value={form.name}
            required
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/30"
          />
        </div>
        <div>
          <label htmlFor="ticket-price" className="block text-sm font-medium text-neutral-900">
            Price (USD)<span aria-hidden="true"> *</span>
          </label>
          <input
            id="ticket-price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            required
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/30"
          />
        </div>
        <div>
          <label htmlFor="ticket-capacity" className="block text-sm font-medium text-neutral-900">
            Capacity<span aria-hidden="true"> *</span>
          </label>
          <input
            id="ticket-capacity"
            type="number"
            min="0"
            step="1"
            value={form.capacity}
            required
            onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/30"
          />
        </div>
        <div className="flex items-center gap-4 sm:col-span-3">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-primary-950 px-6 py-2 text-sm font-medium text-neutral-50 transition-colors duration-fast ease-premium hover:bg-primary-900 disabled:opacity-50"
          >
            {submitting ? <ButtonSpinner /> : null}
            {editingId ? 'Save Changes' : 'Add Ticket Type'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-medium text-neutral-600 underline-offset-2 transition-colors duration-fast ease-premium hover:underline"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
