'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import { ButtonSpinner } from '@/components/admin/ui';
import { toastError } from '@/components/toast/use-toast';

const ALLOWED_TYPES = 'image/png,image/jpeg,image/webp';

async function uploadFile(file: File, folder: string): Promise<string> {
  const body = new FormData();
  body.set('file', file);
  body.set('folder', folder);
  const response = await fetch('/api/admin/uploads', { method: 'POST', body });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message ?? 'Unable to upload image');
  }
  return data.url as string;
}

export function MultiImageUploadField({
  label,
  value,
  onChange,
  folder,
}: {
  label: string;
  value: string[];
  onChange: (urls: string[]) => void;
  folder: string;
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState('');

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setStatus('Uploading…');
    try {
      const urls: string[] = [];
      for (const file of list) {
        const url = await uploadFile(file, folder);
        urls.push(url);
      }
      onChange([...value, ...urls]);
      setStatus('Upload complete');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to upload image';
      toastError('Unable to upload image', message);
      setStatus(message);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer.files?.length) void handleFiles(event.dataTransfer.files);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <span id={`${inputId}-label`} className="block text-sm font-medium text-neutral-900">
        {label}
      </span>

      <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {value.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
          >
            <Image src={url} alt="" fill className="object-cover" unoptimized={url.startsWith('/uploads/')} />
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label={`Remove image ${index + 1}`}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900/70 text-xs font-medium text-neutral-50 opacity-0 transition-opacity duration-fast ease-premium hover:bg-neutral-900 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
            >
              ×
            </button>
          </div>
        ))}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-2 text-center transition-colors duration-fast ease-premium ${
            dragActive ? 'border-primary-950 bg-primary-950/5' : 'border-neutral-300 hover:border-primary-950'
          }`}
        >
          {uploading ? (
            <ButtonSpinner className="h-4 w-4" />
          ) : (
            <label
              htmlFor={inputId}
              className="cursor-pointer text-xs font-medium text-primary-950 underline-offset-2 hover:underline focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-950"
            >
              + Add image
            </label>
          )}
          <input
            id={inputId}
            type="file"
            accept={ALLOWED_TYPES}
            multiple
            aria-labelledby={`${inputId}-label`}
            onChange={(e) => {
              if (e.target.files?.length) void handleFiles(e.target.files);
              e.target.value = '';
            }}
            className="sr-only"
          />
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  );
}
