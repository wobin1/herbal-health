export type ToastVariant = 'success' | 'error';

export type Toast = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
};

export type ToastInput = {
  variant: ToastVariant;
  title: string;
  description?: string;
  /** Milliseconds before auto-dismiss. Defaults to 5000 (success) / 7000 (error). */
  duration?: number;
};

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();
let nextId = 0;

function emit() {
  for (const listener of listeners) listener(toasts);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): Toast[] {
  return toasts;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

export function pushToast(input: ToastInput): string {
  const id = `toast-${++nextId}`;
  toasts = [...toasts, { id, variant: input.variant, title: input.title, description: input.description }];
  emit();

  const duration = input.duration ?? (input.variant === 'error' ? 7000 : 5000);
  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration);
  }

  return id;
}
