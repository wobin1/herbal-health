'use client';

import { useEffect, useState } from 'react';
import { AlertCircleIcon, CheckCircleIcon, CloseIcon } from '@/components/icons';
import { dismissToast, getToasts, subscribe, type Toast } from '@/components/toast/toast-store';

const variantStyles = {
  success: {
    icon: CheckCircleIcon,
    iconClassName: 'text-primary-600',
    accentClassName: 'bg-primary-600',
  },
  error: {
    icon: AlertCircleIcon,
    iconClassName: 'text-red-600',
    accentClassName: 'bg-red-600',
  },
} as const;

function ToastCard({ toast }: { toast: Toast }) {
  const { icon: Icon, iconClassName, accentClassName } = variantStyles[toast.variant];

  return (
    <li
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className="animate-slide-in-right pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-xl shadow-neutral-900/10 backdrop-blur-sm"
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${accentClassName}`} />
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconClassName}`} />
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold text-neutral-900">{toast.title}</p>
        {toast.description ? <p className="mt-0.5 text-sm text-neutral-600">{toast.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss notification"
        className="ease-premium duration-fast -mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </li>
  );
}

export function ToastViewport() {
  const [toasts, setToasts] = useState<Toast[]>(getToasts);

  useEffect(() => subscribe(setToasts), []);

  return (
    <ol
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-stretch gap-2.5 sm:inset-x-auto sm:right-4 sm:items-end"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </ol>
  );
}
