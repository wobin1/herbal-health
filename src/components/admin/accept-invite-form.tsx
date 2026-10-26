'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ButtonSpinner } from '@/components/admin/ui';

const MIN_LENGTH = 12;

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error?.message ?? 'Unable to accept invitation');
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="mt-6">
        <p className="text-sm text-neutral-800">Your account is ready.</p>
        <Link
          href="/admin/login"
          className="bg-primary-950 hover:bg-primary-900 mt-4 inline-block rounded-full px-6 py-2 text-sm font-medium text-neutral-50 transition-colors"
        >
          Continue to sign in
        </Link>
      </div>
    );
  }

  const inputClassName =
    'focus:border-primary-600 focus:ring-primary-600/30 rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:ring-2 focus:outline-none';

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      {/* Lets password managers file the new password under the right account. */}
      <input type="email" value={email} autoComplete="username" readOnly hidden />
      {error ? (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="invite-password" className="text-sm font-medium text-neutral-800">
          New password
        </label>
        <input
          id="invite-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_LENGTH}
          aria-describedby="invite-password-hint"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClassName}
        />
        <p id="invite-password-hint" className="text-xs text-neutral-500">
          At least {MIN_LENGTH} characters.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="invite-confirm" className="text-sm font-medium text-neutral-800">
          Confirm password
        </label>
        <input
          id="invite-confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClassName}
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="bg-primary-950 hover:bg-primary-900 inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-neutral-50 transition-colors disabled:opacity-50"
      >
        {submitting ? <ButtonSpinner /> : null}
        Create account
      </button>
    </form>
  );
}
