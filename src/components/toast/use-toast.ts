import { pushToast, type ToastInput } from '@/components/toast/toast-store';

/**
 * Fire-and-forget toast for reporting the outcome of a backend operation
 * (save, delete, send, etc.) anywhere in the app — landing pages and admin alike.
 */
export function toast(input: ToastInput): string {
  return pushToast(input);
}

export function toastSuccess(title: string, description?: string): string {
  return pushToast({ variant: 'success', title, description });
}

export function toastError(title: string, description?: string): string {
  return pushToast({ variant: 'error', title, description });
}
