'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface LocationRow {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string | null;
  country: string;
}

const EMPTY = { name: '', address: '', city: '', state: '', postalCode: '', country: 'US' };

export function LocationManager({ locations }: { locations: LocationRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, postalCode: form.postalCode || null }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error?.message ?? 'Unable to create location');
        return;
      }
      setForm(EMPTY);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <table className="w-full min-w-[600px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-neutral-500">
            <th scope="col" className="py-2 pr-4">Name</th>
            <th scope="col" className="py-2 pr-4">Address</th>
            <th scope="col" className="py-2 pr-4">City</th>
            <th scope="col" className="py-2 pr-4">State</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((location) => (
            <tr key={location.id} className="border-b border-neutral-100">
              <td className="py-3 pr-4 font-medium text-neutral-900">{location.name}</td>
              <td className="py-3 pr-4 text-neutral-600">{location.address}</td>
              <td className="py-3 pr-4 text-neutral-600">{location.city}</td>
              <td className="py-3 pr-4 text-neutral-600">{location.state}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {locations.length === 0 ? <p className="mt-4 text-neutral-600">No locations yet.</p> : null}

      <form onSubmit={handleCreate} className="mt-8 grid gap-4 rounded-lg border border-neutral-100 p-6 sm:grid-cols-3">
        <h2 className="text-lg font-semibold text-neutral-900 sm:col-span-3">Add Location</h2>
        {error ? (
          <p role="alert" className="sm:col-span-3 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        <LabeledInput label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
        <LabeledInput label="Address" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} required />
        <LabeledInput label="City" value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} required />
        <LabeledInput label="State" value={form.state} onChange={(v) => setForm((f) => ({ ...f, state: v }))} required />
        <LabeledInput label="Postal Code" value={form.postalCode} onChange={(v) => setForm((f) => ({ ...f, postalCode: v }))} />
        <LabeledInput label="Country" value={form.country} onChange={(v) => setForm((f) => ({ ...f, country: v }))} required />
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-primary-950 px-6 py-2 text-sm font-medium text-neutral-50 disabled:opacity-50"
          >
            Add Location
          </button>
        </div>
      </form>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const id = `location-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-900">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950"
      />
    </div>
  );
}
