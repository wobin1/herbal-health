'use client';

import { useCallback, useState } from 'react';
import { AdminModal } from '@/components/admin/admin-modal';

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
  const [open, setOpen] = useState(false);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setState({ message, resolve });
      setOpen(true);
    });
  }, []);

  const close = useCallback(
    (confirmed: boolean) => {
      state?.resolve(confirmed);
      setOpen(false);
    },
    [state],
  );

  const dialog = state ? (
    <AdminModal
      open={open}
      onClose={() => close(false)}
      onExited={() => setState(null)}
      role="alertdialog"
      labelledBy="confirm-dialog-message"
      className="max-w-sm"
    >
      <p id="confirm-dialog-message" className="pr-6 text-sm text-neutral-900">
        {state.message}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => close(false)}
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors duration-fast ease-premium hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Cancel
        </button>
        <button
          type="button"
          autoFocus
          onClick={() => close(true)}
          className="bg-primary-950 rounded-full px-4 py-2 text-sm font-medium text-neutral-50 transition-colors duration-fast ease-premium hover:bg-primary-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Confirm
        </button>
      </div>
    </AdminModal>
  ) : null;

  return { confirm, dialog };
}
