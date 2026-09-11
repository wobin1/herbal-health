'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Stage =
  | { step: 'credentials' }
  | { step: 'mfa_setup'; challengeToken: string; provisioningUri: string }
  | { step: 'mfa_required'; challengeToken: string };

export default function AdminLoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ step: 'credentials' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCredentialsSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error?.message ?? 'Unable to sign in');
        return;
      }
      if (data.status === 'mfa_setup_required') {
        setStage({
          step: 'mfa_setup',
          challengeToken: data.challengeToken,
          provisioningUri: data.provisioningUri,
        });
      } else if (data.status === 'mfa_required') {
        setStage({ step: 'mfa_required', challengeToken: data.challengeToken });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSubmit(event: FormEvent) {
    event.preventDefault();
    if (stage.step === 'credentials') return;
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken: stage.challengeToken, code }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error?.message ?? 'Unable to verify code');
        return;
      }
      router.push('/admin/events');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="mb-6 text-xl font-semibold">Herbal Health Admin</h1>

      {error && (
        <p role="alert" className="mb-4 rounded border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {stage.step === 'credentials' && (
        <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary-950 rounded px-4 py-2 font-medium text-neutral-50 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}

      {stage.step === 'mfa_setup' && (
        <form onSubmit={handleMfaSubmit} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-neutral-700">
            Scan this into an authenticator app, then enter the 6-digit code to finish setting up
            multi-factor authentication.
          </p>
          <p className="break-all rounded border border-neutral-300 bg-neutral-100 px-3 py-2 text-xs">
            {stage.provisioningUri}
          </p>
          <div className="flex flex-col gap-1">
            <label htmlFor="code" className="text-sm font-medium">
              6-digit code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary-950 rounded px-4 py-2 font-medium text-neutral-50 disabled:opacity-60"
          >
            {submitting ? 'Verifying…' : 'Verify and finish setup'}
          </button>
        </form>
      )}

      {stage.step === 'mfa_required' && (
        <form onSubmit={handleMfaSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1">
            <label htmlFor="code" className="text-sm font-medium">
              6-digit authentication code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary-950 rounded px-4 py-2 font-medium text-neutral-50 disabled:opacity-60"
          >
            {submitting ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      )}
    </div>
  );
}
