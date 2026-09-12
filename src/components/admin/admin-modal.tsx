'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { XIcon } from '@/components/admin/icons';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Belt-and-suspenders for the CSS animation → animationend → unmount chain:
// a backgrounded tab, a dropped frame, or a browser quirk can occasionally
// swallow the animationend event, which would otherwise leave the modal
// stuck on screen forever after Cancel/Escape/backdrop-click. This timer
// force-closes shortly after the animation should have finished either way.
const CLOSE_FALLBACK_MS = 400;

/**
 * Shared backdrop + panel modal with a proper enter/exit animation. `open`
 * is the logical open state owned by the caller; the modal stays mounted
 * through its exit animation and calls `onExited` once it's actually gone,
 * so callers that need to clear form/dialog state can do it then.
 */
export function AdminModal({
  open,
  onClose,
  onExited,
  role = 'dialog',
  labelledBy,
  className = '',
  children,
}: {
  open: boolean;
  onClose: () => void;
  onExited?: () => void;
  role?: 'dialog' | 'alertdialog';
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  const wasRendered = useRef(rendered);

  // Derived-state-from-props update, done during render (React's recommended
  // pattern for "adjusting state when a prop changes") rather than in an
  // effect, so opening/closing doesn't cost an extra render pass.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setRendered(true);
      setClosing(false);
    } else if (rendered) {
      if (prefersReducedMotion()) {
        setRendered(false);
      } else {
        setClosing(true);
      }
    }
  }

  useEffect(() => {
    if (rendered) {
      wasRendered.current = true;
    } else if (wasRendered.current) {
      wasRendered.current = false;
      onExited?.();
    }
  }, [rendered, onExited]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => setRendered(false), CLOSE_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [closing]);

  if (!rendered) return null;

  function handlePanelAnimationEnd() {
    if (closing) {
      setRendered(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/50 px-4 py-8 backdrop-blur-sm ${
        closing ? 'animate-admin-backdrop-out' : 'animate-admin-backdrop'
      }`}
      onClick={onClose}
    >
      <div
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        onAnimationEnd={handlePanelAnimationEnd}
        onClick={(event) => event.stopPropagation()}
        className={`relative w-full rounded-2xl bg-white p-6 shadow-2xl shadow-neutral-900/20 ring-1 ring-neutral-900/10 sm:p-8 ${
          closing ? 'animate-admin-panel-out' : 'animate-admin-panel'
        } ${className}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1.5 text-neutral-400 transition-colors duration-fast ease-premium hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-950"
        >
          <XIcon className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
