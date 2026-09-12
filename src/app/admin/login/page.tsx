'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 px-4 py-10">
      <Image
        src="/images/hero-mortar-pestle.png"
        alt=""
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />

      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-6 sm:px-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white"
        >
          <span aria-hidden="true">&larr;</span> Back
        </Link>
        <span className="flex items-center gap-2 font-serif text-lg text-white">
          <Image
            src="/herbal-logo.jpeg"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-full object-cover"
          />
          Herbal Health
        </span>
        <Link
          href="/contact"
          className="text-sm font-medium text-white/90 hover:text-white"
        >
          Contact support
        </Link>
      </header>

      <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="font-serif text-2xl text-primary-950">
          {stage.step === 'credentials' ? 'Log in to Herbal Health' : 'Verify your identity'}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          {stage.step === 'credentials'
            ? 'Admin access to the seminar series dashboard'
            : 'Enter the code from your authenticator app'}
        </p>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        {stage.step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-neutral-800">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-neutral-800">
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
                className="rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-lg bg-primary-950 px-4 py-2.5 text-sm font-medium text-neutral-50 transition hover:bg-primary-900 disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        {stage.step === 'mfa_setup' && (
          <form onSubmit={handleMfaSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <p className="text-sm text-neutral-700">
              Scan this into an authenticator app, then enter the 6-digit code to finish setting up
              multi-factor authentication.
            </p>
            <p className="break-all rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-xs">
              {stage.provisioningUri}
            </p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="code" className="text-sm font-medium text-neutral-800">
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
                className="rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-lg bg-primary-950 px-4 py-2.5 text-sm font-medium text-neutral-50 transition hover:bg-primary-900 disabled:opacity-60"
            >
              {submitting ? 'Verifying…' : 'Verify and finish setup'}
            </button>
          </form>
        )}

        {stage.step === 'mfa_required' && (
          <form onSubmit={handleMfaSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="code" className="text-sm font-medium text-neutral-800">
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
                className="rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-lg bg-primary-950 px-4 py-2.5 text-sm font-medium text-neutral-50 transition hover:bg-primary-900 disabled:opacity-60"
            >
              {submitting ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
