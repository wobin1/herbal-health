'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface InstructorRow {
  id: string;
  slug: string;
  name: string;
  shortBio: string;
  published: boolean;
}

const EMPTY = { slug: '', name: '', shortBio: '', fullBio: '' };

export function InstructorManager({ instructors }: { instructors: InstructorRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/instructors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error?.message ?? 'Unable to create instructor');
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
            <th scope="col" className="py-2 pr-4">Slug</th>
            <th scope="col" className="py-2 pr-4">Published</th>
          </tr>
        </thead>
        <tbody>
          {instructors.map((instructor) => (
            <tr key={instructor.id} className="border-b border-neutral-100">
              <td className="py-3 pr-4 font-medium text-neutral-900">{instructor.name}</td>
              <td className="py-3 pr-4 text-neutral-600">{instructor.slug}</td>
              <td className="py-3 pr-4 text-neutral-600">{instructor.published ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {instructors.length === 0 ? <p className="mt-4 text-neutral-600">No instructors yet.</p> : null}

      <form onSubmit={handleCreate} className="mt-8 grid gap-4 rounded-lg border border-neutral-100 p-6 sm:grid-cols-2">
        <h2 className="text-lg font-semibold text-neutral-900 sm:col-span-2">Add Instructor</h2>
        {error ? (
          <p role="alert" className="sm:col-span-2 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        <LabeledInput label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
        <LabeledInput label="Slug" value={form.slug} onChange={(v) => setForm((f) => ({ ...f, slug: v }))} required />
        <LabeledTextarea
          label="Short Bio"
          value={form.shortBio}
          onChange={(v) => setForm((f) => ({ ...f, shortBio: v }))}
          required
        />
        <LabeledTextarea
          label="Full Bio"
          value={form.fullBio}
          onChange={(v) => setForm((f) => ({ ...f, fullBio: v }))}
          required
        />
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-primary-950 px-6 py-2 text-sm font-medium text-neutral-50 disabled:opacity-50"
          >
            Add Instructor
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
  const id = `instructor-${label.toLowerCase().replace(/\s+/g, '-')}`;
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

function LabeledTextarea({
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
  const id = `instructor-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-900">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <textarea
        id={id}
        value={value}
        required={required}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950"
      />
    </div>
  );
}
