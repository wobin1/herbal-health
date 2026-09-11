'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
        setError(data.error?.message ?? 'Unable to save ticket type');
        return;
      }
      resetForm();
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
        setError(data?.error?.message ?? 'Unable to delete ticket type');
        return;
      }
      if (editingId === id) resetForm();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <table className="w-full min-w-[500px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-neutral-500">
            <th scope="col" className="py-2 pr-4">Name</th>
            <th scope="col" className="py-2 pr-4">Price</th>
            <th scope="col" className="py-2 pr-4">Capacity</th>
            <th scope="col" className="py-2 pr-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {ticketTypes.map((ticketType) => (
            <tr key={ticketType.id} className="border-b border-neutral-100">
              <td className="py-3 pr-4 font-medium text-neutral-900">{ticketType.name}</td>
              <td className="py-3 pr-4 text-neutral-600">
                {formatPrice(ticketType.priceMinorUnits, ticketType.currency)}
              </td>
              <td className="py-3 pr-4 text-neutral-600">{ticketType.capacity}</td>
              <td className="py-3 pr-4">
                <button
                  type="button"
                  onClick={() => startEdit(ticketType)}
                  className="mr-3 text-sm font-medium text-primary-950 underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(ticketType.id)}
                  disabled={submitting}
                  className="text-sm font-medium text-red-700 underline disabled:opacity-50"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {ticketTypes.length === 0 ? <p className="mt-4 text-neutral-600">No ticket types yet.</p> : null}

      <form onSubmit={handleSubmit} className="mt-8 grid gap-4 rounded-lg border border-neutral-100 p-6 sm:grid-cols-3">
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
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950"
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
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950"
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
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950"
          />
        </div>
        <div className="flex items-center gap-4 sm:col-span-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-primary-950 px-6 py-2 text-sm font-medium text-neutral-50 disabled:opacity-50"
          >
            {editingId ? 'Save Changes' : 'Add Ticket Type'}
          </button>
          {editingId ? (
            <button type="button" onClick={resetForm} className="text-sm font-medium text-neutral-600 underline">
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
