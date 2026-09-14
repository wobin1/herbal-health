'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useConfirm } from '@/components/confirm-dialog';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { BookOpenIcon } from '@/components/admin/icons';
import { AdminModal } from '@/components/admin/admin-modal';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import { isAllowedImageUrl } from '@/lib/image-hosts';
import { toastError, toastSuccess } from '@/components/toast/use-toast';
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

export interface EducationFocusItemRow {
  id: string;
  icon: string;
  title: string;
  description: string;
  imageUrl: string | null;
  sortOrder: number;
  published: boolean;
}

type FormState = {
  id: string | null;
  icon: string;
  title: string;
  description: string;
  imageUrl: string;
  sortOrder: string;
  published: boolean;
};

const EMPTY: FormState = {
  id: null,
  icon: 'shield',
  title: '',
  description: '',
  imageUrl: '',
  sortOrder: '0',
  published: true,
};

export function EducationFocusItemManager({
  items,
  pagination,
}: {
  items: EducationFocusItemRow[];
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

  function editItem(item: EducationFocusItemRow) {
    setError(null);
    setForm({
      id: item.id,
      icon: item.icon,
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl ?? '',
      sortOrder: String(item.sortOrder),
      published: item.published,
    });
    setIsOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        icon: form.icon,
        title: form.title,
        description: form.description,
        imageUrl: form.imageUrl || null,
        sortOrder: Number(form.sortOrder) || 0,
        published: form.published,
      };
      const response = await fetch(
        isEditing ? `/api/admin/education-focus-items/${form.id}` : '/api/admin/education-focus-items',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        const message = data.error?.message ?? 'Unable to save item';
        setError(message);
        toastError('Unable to save item', message);
        return;
      }
      setIsOpen(false);
      toastSuccess('Item saved');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirm('Delete this item?'))) return;
    setError(null);
    const response = await fetch(`/api/admin/education-focus-items/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message = data?.error?.message ?? 'Unable to delete item';
      setError(message);
      toastError('Unable to delete item', message);
      return;
    }
    if (form.id === id) {
      setIsOpen(false);
    }
    toastSuccess('Item deleted');
    router.refresh();
  }

  async function handleTogglePublished(item: EducationFocusItemRow) {
    setError(null);
    const response = await fetch(`/api/admin/education-focus-items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !item.published }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message = data?.error?.message ?? 'Unable to update item';
      setError(message);
      toastError('Unable to update item', message);
      return;
    }
    toastSuccess(item.published ? 'Item set to draft' : 'Item published');
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
          Add Item
        </button>
      </div>
      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<BookOpenIcon className="h-8 w-8" />}
            title="No items yet"
            description="Add a “What You'll Learn” item to feature it on the homepage."
          />
        </div>
      ) : (
        <div className={`${tableShellClassName} mt-4 overflow-x-auto`}>
          <table className={`${tableClassName} min-w-[700px]`}>
            <thead className={theadClassName}>
              <tr className="border-b border-neutral-200">
                <th scope="col" className={thClassName}>Image</th>
                <th scope="col" className={thClassName}>Title</th>
                <th scope="col" className={thClassName}>Sort</th>
                <th scope="col" className={thClassName}>Published</th>
                <th scope="col" className={thClassName}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={trClassName}>
                  <td className={tdClassName}>
                    {item.imageUrl ? (
                      <div className="relative h-12 w-16 overflow-hidden rounded-md bg-neutral-100">
                        {isAllowedImageUrl(item.imageUrl) ? (
                          <Image src={item.imageUrl} alt="" fill className="object-cover" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                    ) : (
                      <div className="h-12 w-16 rounded-md bg-neutral-100" aria-hidden="true" />
                    )}
                  </td>
                  <td className={tdPrimaryClassName}>{item.title}</td>
                  <td className={tdClassName}>{item.sortOrder}</td>
                  <td className={tdClassName}>
                    <button
                      type="button"
                      onClick={() => handleTogglePublished(item)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-fast ease-premium ${
                        item.published
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300'
                          : 'border-neutral-300 text-neutral-700 hover:border-primary-950'
                      }`}
                    >
                      {item.published ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className={tdClassName}>
                    <div className={rowActionsClassName}>
                      <button
                        type="button"
                        onClick={() => editItem(item)}
                        className="text-sm font-medium text-primary-950 underline-offset-2 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
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
        labelledBy="focus-item-modal-title"
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <h2 id="focus-item-modal-title" className="pr-8 text-xl font-semibold tracking-tight text-neutral-900 sm:col-span-2">
            {isEditing ? 'Edit Item' : 'Add Item'}
          </h2>
          {error ? (
            <p
              role="alert"
              className="sm:col-span-2 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          ) : null}
          <LabeledInput label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} required />
          <LabeledInput
            label="Sort Order"
            type="number"
            value={form.sortOrder}
            onChange={(v) => setForm((f) => ({ ...f, sortOrder: v }))}
          />
          <LabeledTextarea
            label="Description"
            value={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            required
          />
          <div className="sm:col-span-2">
            <ImageUploadField
              label="Image"
              value={form.imageUrl || null}
              onChange={(url) => setForm((f) => ({ ...f, imageUrl: url ?? '' }))}
              folder="focus-items"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="focus-item-published"
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
              className="h-4 w-4 rounded border-neutral-300"
            />
            <label htmlFor="focus-item-published" className="text-sm font-medium text-neutral-900">
              Published
            </label>
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-primary-950 px-6 py-2 text-sm font-medium text-neutral-50 transition-colors duration-fast ease-premium hover:bg-primary-900 disabled:opacity-50"
            >
              {submitting ? <ButtonSpinner /> : null}
              {isEditing ? 'Save Changes' : 'Add Item'}
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
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  const id = `focus-item-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-900">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        type={type}
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
  const id = `focus-item-${label.toLowerCase().replace(/\s+/g, '-')}`;
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
