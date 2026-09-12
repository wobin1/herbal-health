'use client';

import { useState } from 'react';

interface RegistrationResult {
  reference: string;
  status: string;
  event: { title: string };
  attendee: { firstName: string; lastName: string };
}

export default function RegistrationLookupPage() {
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ reference, email });
      const response = await fetch(`/api/registrations/lookup?${params.toString()}`);
      if (!response.ok) {
        setError('No registration found for that reference and email.');
        return;
      }
      const body = await response.json();
      setResult(body.registration);
    } catch {
      setError('Unable to look up registration. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-2xl font-semibold text-neutral-900">Find Your Registration</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        <div>
          <label htmlFor="reference" className="block text-sm font-medium text-neutral-700">
            Registration Reference
          </label>
          <input
            id="reference"
            required
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="HHS-2026-XXXXXX"
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-primary-950 px-6 py-3 text-sm font-medium text-neutral-50 disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Find Registration'}
        </button>
      </form>

      {error ? (
        <p role="alert" className="mt-6 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-8 rounded-md border border-neutral-300 p-4">
          <p className="font-medium text-neutral-900">{result.reference}</p>
          <p className="text-neutral-600">{result.event.title}</p>
          <p className="text-neutral-600">
            {result.attendee.firstName} {result.attendee.lastName}
          </p>
          <p className="text-neutral-600">Status: {result.status}</p>
        </div>
      ) : null}
    </main>
  );
}
