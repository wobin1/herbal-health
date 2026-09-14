'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useConfirm } from '@/components/confirm-dialog';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { ImageIcon } from '@/components/admin/icons';
import { AdminModal } from '@/components/admin/admin-modal';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import { MultiImageUploadField } from '@/components/admin/multi-image-upload-field';
import { toastError, toastSuccess } from '@/components/toast/use-toast';
import { ButtonSpinner, EmptyState } from '@/components/admin/ui';

export interface GalleryImageRow {
  id: string;
  url: string;
  caption: string | null;
  sortOrder: number;
  published: boolean;
}

type FormState = {
  id: string | null;
  urls: string[];
  caption: string;
  sortOrder: string;
  published: boolean;
};

const EMPTY: FormState = {
  id: null,
  urls: [],
  caption: '',
  sortOrder: '0',
  published: true,
};

export function GalleryManager({
  images,
  pagination,
}: {
  images: GalleryImageRow[];
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

  function editItem(item: GalleryImageRow) {
    setError(null);
    setForm({
      id: item.id,
      urls: [item.url],
      caption: item.caption ?? '',
      sortOrder: String(item.sortOrder),
      published: item.published,
    });
    setIsOpen(true);
  }

  async function saveOne(url: string, sortOrder: number, id: string | null) {
    const payload = {
      url,
      caption: form.caption || null,
      sortOrder,
      published: form.published,
    };
    const response = await fetch(id ? `/api/admin/gallery/${id}` : '/api/admin/gallery', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message ?? 'Unable to save image');
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (form.urls.length === 0) {
      setError('Add at least one image.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const baseSortOrder = Number(form.sortOrder) || 0;
      if (isEditing) {
        await saveOne(form.urls[0], baseSortOrder, form.id);
      } else {
        await Promise.all(form.urls.map((url, index) => saveOne(url, baseSortOrder + index, null)));
      }
      setIsOpen(false);
      toastSuccess(form.urls.length > 1 ? `${form.urls.length} images saved` : 'Image saved');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save image';
      setError(message);
      toastError('Unable to save image', message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirm('Delete this image?'))) return;
    setError(null);
    const response = await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message = data?.error?.message ?? 'Unable to delete image';
      setError(message);
      toastError('Unable to delete image', message);
      return;
    }
    if (form.id === id) {
      setIsOpen(false);
    }
    toastSuccess('Image deleted');
    router.refresh();
  }

  async function handleTogglePublished(item: GalleryImageRow) {
    setError(null);
    const response = await fetch(`/api/admin/gallery/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !item.published }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message = data?.error?.message ?? 'Unable to update image';
      setError(message);
      toastError('Unable to update image', message);
      return;
    }
    toastSuccess(item.published ? 'Image set to draft' : 'Image published');
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
          Add Image
        </button>
      </div>

      {images.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<ImageIcon className="h-8 w-8" />}
            title="No images yet"
            description="Upload an image to feature it on the public gallery page."
          />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow duration-fast ease-premium hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-[4/3] w-full bg-neutral-100">
                <Image src={item.url} alt="" fill className="object-cover" unoptimized={item.url.startsWith('/uploads/')} />
                <div className="absolute right-2 top-2 flex gap-2 opacity-0 transition-opacity duration-fast ease-premium group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => editItem(item)}
                    className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-primary-950 shadow-sm hover:bg-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-red-700 shadow-sm hover:bg-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <p className="min-w-0 flex-1 truncate text-sm text-neutral-700">{item.caption || 'Untitled'}</p>
                <button
                  type="button"
                  onClick={() => handleTogglePublished(item)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-fast ease-premium ${
                    item.published
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300'
                      : 'border-neutral-300 text-neutral-700 hover:border-primary-950'
                  }`}
                >
                  {item.published ? 'Published' : 'Draft'}
                </button>
              </div>
            </div>
          ))}
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
        labelledBy="gallery-image-modal-title"
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <h2 id="gallery-image-modal-title" className="pr-8 text-xl font-semibold tracking-tight text-neutral-900 sm:col-span-2">
            {isEditing ? 'Edit Image' : 'Add Image'}
          </h2>
          {error ? (
            <p role="alert" className="sm:col-span-2 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            {isEditing ? (
              <ImageUploadField
                label="Image"
                value={form.urls[0] ?? null}
                onChange={(url) => setForm((f) => ({ ...f, urls: url ? [url] : [] }))}
                folder="gallery"
                required
              />
            ) : (
              <MultiImageUploadField
                label="Images"
                value={form.urls}
                onChange={(urls) => setForm((f) => ({ ...f, urls }))}
                folder="gallery"
              />
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="gallery-caption" className="block text-sm font-medium text-neutral-900">
              Caption {!isEditing && form.urls.length > 1 ? <span className="font-normal text-neutral-500">(applied to all)</span> : null}
            </label>
            <input
              id="gallery-caption"
              type="text"
              value={form.caption}
              onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/30"
            />
          </div>
          <div>
            <label htmlFor="gallery-sort-order" className="block text-sm font-medium text-neutral-900">
              Sort Order
            </label>
            <input
              id="gallery-sort-order"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="gallery-published"
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
              className="h-4 w-4 rounded border-neutral-300"
            />
            <label htmlFor="gallery-published" className="text-sm font-medium text-neutral-900">
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
              {isEditing ? 'Save Changes' : form.urls.length > 1 ? `Add ${form.urls.length} Images` : 'Add Image'}
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
