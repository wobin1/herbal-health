'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export interface LightboxImage {
  id: string;
  url: string;
  caption: string | null;
}

export function GalleryLightbox({ images }: { images: LightboxImage[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const active = activeIndex !== null ? images[activeIndex] : null;

  function open(index: number, trigger: HTMLElement) {
    lastTriggerRef.current = trigger;
    setActiveIndex(index);
  }

  function close() {
    setActiveIndex(null);
    lastTriggerRef.current?.focus();
  }

  useEffect(() => {
    if (activeIndex === null) return;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key === 'ArrowRight') {
        setActiveIndex((i) => (i === null ? i : (i + 1) % images.length));
        return;
      }
      if (event.key === 'ArrowLeft') {
        setActiveIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length));
        return;
      }
      if (event.key === 'Tab') {
        // Simple focus trap: the dialog only contains the close button as a
        // focusable element, so keep focus pinned there.
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, images.length]);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={(e) => open(index, e.currentTarget)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-sm transition-transform duration-fast ease-premium hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-950"
          >
            <Image
              src={image.url}
              alt={image.caption ?? ''}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-slow ease-premium group-hover:scale-105"
              unoptimized={image.url.startsWith('/uploads/')}
            />
            {image.caption ? (
              <span
                className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-neutral-950/85 via-neutral-950/40 to-transparent px-3 pb-2.5 pt-6 text-left text-sm font-medium text-neutral-50 opacity-0 transition-all duration-fast ease-premium group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
              >
                {image.caption}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.caption ?? 'Gallery image'}
          className="animate-admin-backdrop fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/85 px-4 py-8 backdrop-blur-sm"
          onClick={close}
        >
          <div className="relative flex max-h-full max-w-4xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute -top-12 right-0 rounded-full p-2 text-neutral-50/90 transition-colors duration-fast ease-premium hover:bg-neutral-50/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-50 sm:top-0 sm:-right-12"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <div className="relative h-[70vh] w-full max-w-3xl overflow-hidden rounded-xl bg-neutral-900">
              <Image
                src={active.url}
                alt={active.caption ?? ''}
                fill
                sizes="100vw"
                className="object-contain"
                unoptimized={active.url.startsWith('/uploads/')}
              />
            </div>
            {active.caption ? <p className="mt-4 text-center text-sm text-neutral-50/80">{active.caption}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
