'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TicketTypeManager, type TicketTypeRow } from '@/components/admin/ticket-type-manager';

const TABS = [
  'General',
  'Schedule',
  'Location',
  'Content',
  'Learning Objectives',
  'Tickets',
  'Media',
  'SEO',
  'Legal',
] as const;

type Tab = (typeof TABS)[number];

export interface EventEditorLocation {
  id: string;
  name: string;
}

export interface EventEditorInitialValues {
  id?: string;
  slug: string;
  title: string;
  seriesName: string;
  volumeLabel: string;
  internalCode: string;
  shortDescription: string;
  longDescription: string;
  startAt: string;
  endAt: string;
  timezone: string;
  city: string;
  state: string;
  locationId: string;
  coverImageUrl: string;
  galleryImageUrls: string;
  documentUrls: string;
  whatYouWillLearn: string;
  materialsIncluded: string;
  prerequisites: string;
  disclaimer: string;
  seoTitle: string;
  seoMetaDescription: string;
  seoCanonicalUrl: string;
  seoOgImageUrl: string;
  status: string;
}

const EMPTY_VALUES: EventEditorInitialValues = {
  slug: '',
  title: '',
  seriesName: '',
  volumeLabel: '',
  internalCode: '',
  shortDescription: '',
  longDescription: '',
  startAt: '',
  endAt: '',
  timezone: 'America/New_York',
  city: '',
  state: '',
  locationId: '',
  coverImageUrl: '',
  galleryImageUrls: '',
  documentUrls: '',
  whatYouWillLearn: '',
  materialsIncluded: '',
  prerequisites: '',
  disclaimer: '',
  seoTitle: '',
  seoMetaDescription: '',
  seoCanonicalUrl: '',
  seoOgImageUrl: '',
  status: 'DRAFT',
};

function toLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function EventEditorForm({
  initialValues,
  locations,
  ticketTypes = [],
  canPublish,
}: {
  initialValues?: EventEditorInitialValues;
  locations: EventEditorLocation[];
  ticketTypes?: TicketTypeRow[];
  canPublish: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(initialValues?.id);
  const [values, setValues] = useState<EventEditorInitialValues>(initialValues ?? EMPTY_VALUES);
  const [activeTab, setActiveTab] = useState<Tab>('General');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof EventEditorInitialValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function buildPayload() {
    return {
      slug: values.slug,
      title: values.title,
      seriesName: values.seriesName || null,
      volumeLabel: values.volumeLabel || null,
      internalCode: values.internalCode || null,
      shortDescription: values.shortDescription,
      longDescription: values.longDescription || null,
      startAt: values.startAt ? new Date(values.startAt).toISOString() : undefined,
      endAt: values.endAt ? new Date(values.endAt).toISOString() : null,
      timezone: values.timezone,
      city: values.city,
      state: values.state,
      locationId: values.locationId || null,
      coverImageUrl: values.coverImageUrl || null,
      galleryImageUrls: toLines(values.galleryImageUrls),
      documentUrls: toLines(values.documentUrls),
      whatYouWillLearn: toLines(values.whatYouWillLearn),
      materialsIncluded: toLines(values.materialsIncluded),
      prerequisites: values.prerequisites || null,
      disclaimer: values.disclaimer || null,
      seoTitle: values.seoTitle || null,
      seoMetaDescription: values.seoMetaDescription || null,
      seoCanonicalUrl: values.seoCanonicalUrl || null,
      seoOgImageUrl: values.seoOgImageUrl || null,
    };
  }

  async function handleSave(event?: React.FormEvent) {
    event?.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = buildPayload();
      const url = isEdit ? `/api/admin/events/${initialValues!.id}` : '/api/admin/events';
      const method = isEdit ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error?.message ?? 'Unable to save event');
        return;
      }
      router.push(`/admin/events/${data.event.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublish() {
    if (!initialValues?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/events/${initialValues.id}/publish`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error?.message ?? 'Unable to publish event');
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8">
      <div role="tablist" aria-label="Event editor sections" className="flex flex-wrap gap-2 border-b border-neutral-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={
              activeTab === tab
                ? 'border-b-2 border-primary-950 px-3 py-2 text-sm font-medium text-primary-950'
                : 'px-3 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-900'
            }
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        {activeTab === 'General' ? (
          <>
            <Field label="Title" id="title" value={values.title} onChange={(v) => update('title', v)} required />
            <Field label="Slug" id="slug" value={values.slug} onChange={(v) => update('slug', v)} required />
            <Field label="Series Name" id="seriesName" value={values.seriesName} onChange={(v) => update('seriesName', v)} />
            <Field label="Volume Label" id="volumeLabel" value={values.volumeLabel} onChange={(v) => update('volumeLabel', v)} />
            <Field label="Internal Code" id="internalCode" value={values.internalCode} onChange={(v) => update('internalCode', v)} />
            <Field
              label="Short Description"
              id="shortDescription"
              value={values.shortDescription}
              onChange={(v) => update('shortDescription', v)}
              required
            />
          </>
        ) : null}

        {activeTab === 'Schedule' ? (
          <>
            <Field label="Start At" id="startAt" type="datetime-local" value={values.startAt} onChange={(v) => update('startAt', v)} required />
            <Field label="End At" id="endAt" type="datetime-local" value={values.endAt} onChange={(v) => update('endAt', v)} required />
            <Field label="Timezone (IANA)" id="timezone" value={values.timezone} onChange={(v) => update('timezone', v)} required />
          </>
        ) : null}

        {activeTab === 'Location' ? (
          <>
            <div>
              <label htmlFor="locationId" className="block text-sm font-medium text-neutral-900">
                Venue
              </label>
              <select
                id="locationId"
                value={values.locationId}
                onChange={(e) => update('locationId', e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">Select a venue</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            <Field label="City (listing)" id="city" value={values.city} onChange={(v) => update('city', v)} required />
            <Field label="State (listing)" id="state" value={values.state} onChange={(v) => update('state', v)} required />
          </>
        ) : null}

        {activeTab === 'Content' ? (
          <TextAreaField
            label="Long Description"
            id="longDescription"
            value={values.longDescription}
            onChange={(v) => update('longDescription', v)}
            required
          />
        ) : null}

        {activeTab === 'Learning Objectives' ? (
          <>
            <TextAreaField
              label="What You Will Learn (one per line)"
              id="whatYouWillLearn"
              value={values.whatYouWillLearn}
              onChange={(v) => update('whatYouWillLearn', v)}
            />
            <TextAreaField
              label="Materials Included (one per line)"
              id="materialsIncluded"
              value={values.materialsIncluded}
              onChange={(v) => update('materialsIncluded', v)}
            />
          </>
        ) : null}

        {activeTab === 'Tickets' ? (
          isEdit ? (
            <TicketTypeManager eventId={initialValues!.id!} ticketTypes={ticketTypes} />
          ) : (
            <p className="text-sm text-neutral-600">Save the event first, then add ticket types here.</p>
          )
        ) : null}

        {activeTab === 'Media' ? (
          <>
            <Field label="Cover Image URL" id="coverImageUrl" value={values.coverImageUrl} onChange={(v) => update('coverImageUrl', v)} required />
            <TextAreaField
              label="Gallery Image URLs (one per line)"
              id="galleryImageUrls"
              value={values.galleryImageUrls}
              onChange={(v) => update('galleryImageUrls', v)}
            />
            <TextAreaField
              label="Document URLs (one per line)"
              id="documentUrls"
              value={values.documentUrls}
              onChange={(v) => update('documentUrls', v)}
            />
          </>
        ) : null}

        {activeTab === 'SEO' ? (
          <>
            <Field label="SEO Title" id="seoTitle" value={values.seoTitle} onChange={(v) => update('seoTitle', v)} />
            <TextAreaField
              label="SEO Meta Description"
              id="seoMetaDescription"
              value={values.seoMetaDescription}
              onChange={(v) => update('seoMetaDescription', v)}
            />
            <Field label="Canonical URL" id="seoCanonicalUrl" value={values.seoCanonicalUrl} onChange={(v) => update('seoCanonicalUrl', v)} />
            <Field label="Open Graph Image URL" id="seoOgImageUrl" value={values.seoOgImageUrl} onChange={(v) => update('seoOgImageUrl', v)} />
          </>
        ) : null}

        {activeTab === 'Legal' ? (
          <>
            <TextAreaField label="Prerequisites" id="prerequisites" value={values.prerequisites} onChange={(v) => update('prerequisites', v)} />
            <TextAreaField label="Disclaimer" id="disclaimer" value={values.disclaimer} onChange={(v) => update('disclaimer', v)} />
          </>
        ) : null}
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={submitting}
          className="rounded-full bg-primary-950 px-6 py-2 text-sm font-medium text-neutral-50 disabled:opacity-50"
        >
          {isEdit ? 'Save Changes' : 'Create Event'}
        </button>
        {isEdit && canPublish && values.status === 'DRAFT' ? (
          <button
            type="button"
            onClick={handlePublish}
            disabled={submitting}
            className="rounded-full border border-primary-950 px-6 py-2 text-sm font-medium text-primary-950 disabled:opacity-50"
          >
            Publish
          </button>
        ) : null}
        {isEdit ? <span className="text-sm text-neutral-500">Status: {values.status}</span> : null}
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-900">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950"
      />
    </div>
  );
}

function TextAreaField({
  label,
  id,
  value,
  onChange,
  required,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-900">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <textarea
        id={id}
        value={value}
        required={required}
        rows={5}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950"
      />
    </div>
  );
}
