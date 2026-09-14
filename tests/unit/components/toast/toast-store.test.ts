import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { dismissToast, getToasts, pushToast, subscribe } from '@/components/toast/toast-store';

describe('toast-store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    for (const toast of getToasts()) dismissToast(toast.id);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a toast and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    pushToast({ variant: 'success', title: 'Saved' });

    expect(getToasts()).toHaveLength(1);
    expect(getToasts()[0].title).toBe('Saved');
    expect(listener).toHaveBeenCalledWith(getToasts());

    unsubscribe();
  });

  it('auto-dismisses a success toast after its default duration', () => {
    pushToast({ variant: 'success', title: 'Saved' });
    expect(getToasts()).toHaveLength(1);

    vi.advanceTimersByTime(5000);

    expect(getToasts()).toHaveLength(0);
  });

  it('keeps error toasts visible longer than success toasts', () => {
    pushToast({ variant: 'error', title: 'Failed' });

    vi.advanceTimersByTime(5000);
    expect(getToasts()).toHaveLength(1);

    vi.advanceTimersByTime(2000);
    expect(getToasts()).toHaveLength(0);
  });

  it('dismisses a specific toast by id without affecting others', () => {
    const firstId = pushToast({ variant: 'success', title: 'First' });
    pushToast({ variant: 'success', title: 'Second' });

    dismissToast(firstId);

    expect(getToasts()).toHaveLength(1);
    expect(getToasts()[0].title).toBe('Second');
  });
});
