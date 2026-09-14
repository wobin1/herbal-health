'use client';

import { useId, useRef, useState } from 'react';
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

export function ImageUploadField({
  label,
  value,
  onChange,
  folder,
  required,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  required?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<string>('');

  async function handleFile(file: File) {
    setUploading(true);
    setStatus('Uploading…');
    try {
      const url = await uploadFile(file, folder);
      onChange(url);
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
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-neutral-900">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`mt-1 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors duration-fast ease-premium ${
          dragActive ? 'border-primary-950 bg-primary-950/5' : 'border-neutral-300 hover:border-primary-950'
        }`}
      >
        {value ? (
          <div className="relative h-32 w-full max-w-xs overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
            <Image src={value} alt="" fill className="object-cover" unoptimized={value.startsWith('/uploads/')} />
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            Drag and drop an image here, or{' '}
            <label
              htmlFor={inputId}
              className="cursor-pointer font-medium text-primary-950 underline-offset-2 hover:underline focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-950"
            >
              browse
            </label>
          </p>
        )}

        {value ? (
          <div className="flex items-center gap-3">
            <label
              htmlFor={inputId}
              className="cursor-pointer rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium text-neutral-700 transition-colors duration-fast ease-premium hover:border-primary-950 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-950"
            >
              Replace
            </label>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setStatus('Image removed');
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium text-red-700 transition-colors duration-fast ease-premium hover:border-red-300 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        ) : null}

        {uploading ? (
          <p className="flex items-center gap-2 text-xs text-neutral-500">
            <ButtonSpinner className="h-3.5 w-3.5" />
            Uploading…
          </p>
        ) : null}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ALLOWED_TYPES}
          required={required && !value}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
          className="sr-only"
        />
      </div>
      <p aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  );
}
