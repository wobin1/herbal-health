'use client';

import { useState, type FormEvent } from 'react';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone'),
          message: data.get('message'),
        }),
      });

      if (!response.ok) throw new Error('request failed');

      setStatus('success');
      form.reset();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div role="status" className="rounded-2xl border border-primary-600/20 bg-primary-600/5 p-6 text-primary-900">
        <p className="font-semibold">Message sent</p>
        <p className="mt-1 text-sm text-neutral-600">
          Thanks for reaching out — our team will get back to you within two business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-neutral-900">
            Your Name <span className="text-accent-600">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={200}
            placeholder="Name"
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-900">
            Email <span className="text-accent-600">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={320}
            placeholder="Email"
            className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-neutral-900">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          maxLength={40}
          placeholder="Phone (optional)"
          className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none sm:max-w-xs"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-neutral-900">
          Your Message <span className="text-accent-600">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          maxLength={5000}
          rows={7}
          placeholder="Enter Here"
          className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none"
        />
      </div>

      {status === 'error' ? (
        <p role="alert" className="text-sm text-red-600">
          We could not send your message. Please try again.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="bg-primary-950 hover:bg-primary-900 inline-flex items-center rounded-full px-8 py-3 font-medium text-neutral-50 transition disabled:opacity-60"
      >
        {status === 'submitting' ? 'Sending…' : 'Submit Message'}
      </button>
    </form>
  );
}
