'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TicketTypeManager, type TicketTypeRow } from '@/components/admin/ticket-type-manager';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import { MultiImageUploadField } from '@/components/admin/multi-image-upload-field';
import { ButtonSpinner } from '@/components/admin/ui';
import { useConfirm } from '@/components/confirm-dialog';
import { toastError, toastSuccess } from '@/components/toast/use-toast';

const TABS = [
  'General',
  'Schedule',
  'Location',
  'Content',
  'Learning Objectives',
  'Tickets',
  'Media',
  'Legal',
] as const;

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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
  const { confirm, dialog } = useConfirm();
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
      slug: slugify(values.title),
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
        const message = data.error?.message ?? 'Unable to save event';
        setError(message);
        toastError('Unable to save event', message);
        return;
      }
      toastSuccess('Event saved');
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
        const message = data.error?.message ?? 'Unable to publish event';
        setError(message);
        toastError('Unable to publish event', message);
        return;
      }
      toastSuccess('Event published');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartSales() {
    if (!initialValues?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/events/${initialValues.id}/start-sales`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        const message = data.error?.message ?? 'Unable to start sales';
        setError(message);
        toastError('Unable to start sales', message);
        return;
      }
      toastSuccess('Sales started');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCloseSales() {
    if (!initialValues?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/events/${initialValues.id}/close-sales`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        const message = data.error?.message ?? 'Unable to close sales';
        setError(message);
        toastError('Unable to close sales', message);
        return;
      }
      toastSuccess('Sales closed');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete() {
    if (!initialValues?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/events/${initialValues.id}/complete`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        const message = data.error?.message ?? 'Unable to complete event';
        setError(message);
        toastError('Unable to complete event', message);
        return;
      }
      toastSuccess('Event marked complete');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelEvent() {
    if (!initialValues?.id) return;
    if (!(await confirm('Cancel this event? Registered attendees will be notified.'))) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/events/${initialValues.id}/cancel`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        const message = data.error?.message ?? 'Unable to cancel event';
        setError(message);
        toastError('Unable to cancel event', message);
        return;
      }
      toastSuccess('Event cancelled');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialValues?.id) return;
    if (!(await confirm('Delete this event? This cannot be undone.'))) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/events/${initialValues.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.error?.message ?? 'Unable to delete event';
        setError(message);
        toastError('Unable to delete event', message);
        return;
      }
      toastSuccess('Event deleted');
      router.push('/admin/events');
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
                ? 'border-b-2 border-primary-950 px-3 py-2 text-sm font-medium text-primary-950 transition-colors duration-fast ease-premium'
                : 'border-b-2 border-transparent px-3 py-2 text-sm font-medium text-neutral-500 transition-colors duration-fast ease-premium hover:text-neutral-900'
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
              <input
                id="locationId"
                list="venue-options"
                value={locations.find((location) => location.id === values.locationId)?.name ?? values.locationId}
                onChange={(e) => {
                  const match = locations.find((location) => location.name === e.target.value);
                  update('locationId', match ? match.id : e.target.value);
                }}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950"
              />
              <datalist id="venue-options">
                {locations.map((location) => (
                  <option key={location.id} value={location.name} />
                ))}
              </datalist>
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
            <ImageUploadField
              label="Cover Image"
              value={values.coverImageUrl || null}
              onChange={(url) => update('coverImageUrl', url ?? '')}
              folder="events"
              required
            />
            <MultiImageUploadField
              label="Gallery Images"
              value={toLines(values.galleryImageUrls)}
              onChange={(urls) => update('galleryImageUrls', urls.join('\n'))}
              folder="events"
            />
            <TextAreaField
              label="Document URLs (one per line)"
              id="documentUrls"
              value={values.documentUrls}
              onChange={(v) => update('documentUrls', v)}
            />
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
          className="inline-flex items-center gap-2 rounded-full bg-primary-950 px-6 py-2 text-sm font-medium text-neutral-50 transition-colors duration-fast ease-premium hover:bg-primary-900 disabled:opacity-50"
        >
          {submitting ? <ButtonSpinner /> : null}
          {isEdit ? 'Save Changes' : 'Create Event'}
        </button>
        {isEdit && canPublish && values.status === 'DRAFT' ? (
          <button
            type="button"
            onClick={handlePublish}
            disabled={submitting}
            className="rounded-full border border-primary-950 px-6 py-2 text-sm font-medium text-primary-950 transition-colors duration-fast ease-premium hover:bg-primary-950/5 disabled:opacity-50"
          >
            Publish
          </button>
        ) : null}
        {isEdit && canPublish && values.status === 'PUBLISHED' ? (
          <button
            type="button"
            onClick={handleStartSales}
            disabled={submitting}
            className="rounded-full border border-primary-950 px-6 py-2 text-sm font-medium text-primary-950 transition-colors duration-fast ease-premium hover:bg-primary-950/5 disabled:opacity-50"
          >
            Start Sales
          </button>
        ) : null}
        {isEdit && canPublish && values.status === 'ON_SALE' ? (
          <button
            type="button"
            onClick={handleCloseSales}
            disabled={submitting}
            className="rounded-full border border-primary-950 px-6 py-2 text-sm font-medium text-primary-950 transition-colors duration-fast ease-premium hover:bg-primary-950/5 disabled:opacity-50"
          >
            Close Sales
          </button>
        ) : null}
        {isEdit && canPublish && (values.status === 'ON_SALE' || values.status === 'CLOSED') ? (
          <button
            type="button"
            onClick={handleComplete}
            disabled={submitting}
            className="rounded-full border border-primary-950 px-6 py-2 text-sm font-medium text-primary-950 transition-colors duration-fast ease-premium hover:bg-primary-950/5 disabled:opacity-50"
          >
            Mark Complete
          </button>
        ) : null}
        {isEdit && canPublish && values.status !== 'CANCELLED' && values.status !== 'COMPLETED' ? (
          <button
            type="button"
            onClick={handleCancelEvent}
            disabled={submitting}
            className="rounded-full border border-red-700 px-6 py-2 text-sm font-medium text-red-700 transition-colors duration-fast ease-premium hover:bg-red-700/5 disabled:opacity-50"
          >
            Cancel Event
          </button>
        ) : null}
        {isEdit ? <span className="text-sm text-neutral-500">Status: {values.status}</span> : null}
        {isEdit && values.status === 'DRAFT' ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="ml-auto text-sm font-medium text-red-700 underline-offset-2 transition-opacity duration-fast ease-premium hover:underline disabled:opacity-50"
          >
            Delete Event
          </button>
        ) : null}
      </div>
      {dialog}
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
