'use client';

import { useCallback, useEffect, useState } from 'react';

interface ConfirmState {
  message: string;
  resolve: (confirmed: boolean) => void;
}

/**
 * Promise-based confirmation modal, replacing window.confirm so admin
 * destructive actions get a styled, accessible dialog instead of the
 * browser-native alert.
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setState({ message, resolve });
    });
  }, []);

  const close = useCallback(
    (confirmed: boolean) => {
      state?.resolve(confirmed);
      setState(null);
    },
    [state],
  );

  useEffect(() => {
    if (!state) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, close]);

  const dialog = state ? (
    <div
      className="animate-admin-backdrop fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 px-4"
      onClick={() => close(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-message"
        className="animate-admin-panel w-full max-w-sm rounded-xl bg-white p-6 shadow-lg ring-1 ring-neutral-900/5"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="confirm-dialog-message" className="text-sm text-neutral-900">
          {state.message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => close(false)}
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => close(true)}
            className="bg-primary-950 rounded-full px-4 py-2 text-sm font-medium text-neutral-50 transition-colors hover:bg-primary-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
