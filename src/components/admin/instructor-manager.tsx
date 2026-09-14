'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/confirm-dialog';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { UsersIcon } from '@/components/admin/icons';
import { AdminModal } from '@/components/admin/admin-modal';
import {
  ButtonSpinner,
  EmptyState,
  rowActionsClassName,
  tableClassName,
  tableShellClassName,
  tdClassName,
  tdPrimaryClassName,
  theadClassName,
  thClassName,
  trClassName,
} from '@/components/admin/ui';
import { toastError, toastSuccess } from '@/components/toast/use-toast';

export interface InstructorRow {
  id: string;
  slug: string;
  name: string;
  shortBio: string;
  published: boolean;
}

type FormState = {
  id: string | null;
  slug: string;
  name: string;
  shortBio: string;
  fullBio: string;
};

const EMPTY: FormState = { id: null, slug: '', name: '', shortBio: '', fullBio: '' };

export function InstructorManager({
  instructors,
  pagination,
}: {
  instructors: InstructorRow[];
  pagination: { page: number; totalPages: number; total: number; basePath: string };
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const isEditing = form.id !== null;

  function closeModal() {
    setIsOpen(false);
  }

  function openAddModal() {
    setError(null);
    setForm(EMPTY);
    setIsOpen(true);
  }

  async function editItem(instructor: InstructorRow) {
    setError(null);
    const response = await fetch(`/api/admin/instructors/${instructor.id}`);
    const data = await response.json();
    if (!response.ok) {
      const message = data.error?.message ?? 'Unable to load instructor';
      setError(message);
      toastError('Unable to load instructor', message);
      return;
    }
    setForm({
      id: data.instructor.id,
      slug: data.instructor.slug,
      name: data.instructor.name,
      shortBio: data.instructor.shortBio,
      fullBio: data.instructor.fullBio,
    });
    setIsOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { slug: form.slug, name: form.name, shortBio: form.shortBio, fullBio: form.fullBio };
      const response = await fetch(
        isEditing ? `/api/admin/instructors/${form.id}` : '/api/admin/instructors',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        const message = data.error?.message ?? 'Unable to save instructor';
        setError(message);
        toastError('Unable to save instructor', message);
        return;
      }
      setIsOpen(false);
      toastSuccess('Instructor saved');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirm('Delete this instructor?'))) return;
    setError(null);
    const response = await fetch(`/api/admin/instructors/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message = data?.error?.message ?? 'Unable to delete instructor';
      setError(message);
      toastError('Unable to delete instructor', message);
      return;
    }
    if (form.id === id) {
      setIsOpen(false);
    }
    toastSuccess('Instructor removed');
    router.refresh();
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openAddModal}
          className="rounded-full bg-primary-950 px-6 py-2 text-sm font-medium text-neutral-50 transition-colors hover:bg-primary-900"
        >
          Add Instructor
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {instructors.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<UsersIcon className="h-8 w-8" />}
            title="No instructors yet"
            description="Add an instructor to feature them on event pages."
          />
        </div>
      ) : (
        <div className={`${tableShellClassName} mt-4 overflow-x-auto`}>
          <table className={`${tableClassName} min-w-[600px]`}>
            <thead className={theadClassName}>
              <tr className="border-b border-neutral-200">
                <th scope="col" className={thClassName}>Name</th>
                <th scope="col" className={thClassName}>Slug</th>
                <th scope="col" className={thClassName}>Published</th>
                <th scope="col" className={thClassName}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {instructors.map((instructor) => (
                <tr key={instructor.id} className={trClassName}>
                  <td className={tdPrimaryClassName}>{instructor.name}</td>
                  <td className={tdClassName}>{instructor.slug}</td>
                  <td className={tdClassName}>{instructor.published ? 'Yes' : 'No'}</td>
                  <td className={tdClassName}>
                    <div className={rowActionsClassName}>
                      <button
                        type="button"
                        onClick={() => editItem(instructor)}
                        className="text-sm font-medium text-primary-950 underline-offset-2 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(instructor.id)}
                        className="text-sm font-medium text-red-700 underline-offset-2 hover:underline"
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
      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        basePath={pagination.basePath}
      />

      <AdminModal
        open={isOpen}
        onClose={closeModal}
        onExited={() => setForm(EMPTY)}
        labelledBy="instructor-modal-title"
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <h2 id="instructor-modal-title" className="pr-8 text-xl font-semibold tracking-tight text-neutral-900 sm:col-span-2">
            {isEditing ? 'Edit Instructor' : 'Add Instructor'}
          </h2>
          {error ? (
            <p
              role="alert"
              className="sm:col-span-2 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800"
            >
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
          <div className="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-primary-950 px-6 py-2 text-sm font-medium text-neutral-50 transition-colors duration-fast ease-premium hover:bg-primary-900 disabled:opacity-50"
            >
              {submitting ? <ButtonSpinner /> : null}
              {isEditing ? 'Save Changes' : 'Add Instructor'}
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-full border border-neutral-300 px-6 py-2 text-sm font-medium text-neutral-700 transition-colors duration-fast ease-premium hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </AdminModal>
      {dialog}
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
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/30"
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
    <div className="sm:col-span-2">
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
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/30"
      />
    </div>
  );
}
