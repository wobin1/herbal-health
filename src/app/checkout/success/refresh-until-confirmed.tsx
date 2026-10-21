'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const INTERVAL_MS = 3_000;
const MAX_ATTEMPTS = 20;

/**
 * The webhook usually lands within seconds of the redirect; re-render the
 * server page until it has, then stop (bounded so a stuck webhook doesn't
 * poll forever — the confirmation email still arrives).
 */
export function RefreshUntilConfirmed() {
  const router = useRouter();

  useEffect(() => {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(timer);
        return;
      }
      router.refresh();
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router]);

  return null;
}
