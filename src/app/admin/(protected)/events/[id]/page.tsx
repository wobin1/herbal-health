import { isValidTimezone, utcToWallTime } from '@/lib/events/event-time';
import { matchTimezone } from '@/lib/events/us-timezones';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/require-admin';
import { hasPermission } from '@/lib/auth/rbac';
import { listAllLocations } from '@/server/services/location-service';
import { EventNotFoundError, getAdminEventById } from '@/server/services/event-service';
import { EventEditorForm, type EventEditorInitialValues } from '@/components/admin/event-editor-form';
import { BackLink } from '@/components/admin/ui';

/** Shows the stored instant as wall-clock time at the event, matching how the form saves it. */
function toDateTimeLocal(date: Date | null | undefined, timezone: string): string {
  if (!date) return '';
  return isValidTimezone(timezone) ? utcToWallTime(date, timezone) : date.toISOString().slice(0, 16);
}

interface EditEventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const session = await requirePermission('events:edit');
  const { id } = await params;
  const locations = await listAllLocations();

  let event;
  try {
    event = await getAdminEventById(id);
  } catch (error) {
    if (error instanceof EventNotFoundError) notFound();
    throw error;
  }

  const initialValues: EventEditorInitialValues = {
    id: event.id,
    slug: event.slug,
    title: event.title,
    seriesName: event.seriesName ?? '',
    volumeLabel: event.volumeLabel ?? '',
    internalCode: event.internalCode ?? '',
    shortDescription: event.shortDescription,
    longDescription: event.longDescription ?? '',
    startAt: toDateTimeLocal(event.startAt, matchTimezone(event.timezone) ?? event.timezone),
    endAt: toDateTimeLocal(event.endAt, matchTimezone(event.timezone) ?? event.timezone),
    timezone: event.timezone,
    city: event.city,
    state: event.state,
    locationId: event.locationId ?? '',
    coverImageUrl: event.coverImageUrl ?? '',
    galleryImageUrls: event.galleryImageUrls.join('\n'),
    documentUrls: event.documentUrls.join('\n'),
    whatYouWillLearn: event.whatYouWillLearn.join('\n'),
    materialsIncluded: event.materialsIncluded.join('\n'),
    prerequisites: event.prerequisites ?? '',
    disclaimer: event.disclaimer ?? '',
    seoTitle: event.seoTitle ?? '',
    seoMetaDescription: event.seoMetaDescription ?? '',
    seoCanonicalUrl: event.seoCanonicalUrl ?? '',
    seoOgImageUrl: event.seoOgImageUrl ?? '',
    status: event.status,
    isFeatured: event.isFeatured,
  };

  return (
    <div>
      <BackLink href="/admin/events" label="Back to Events" />
      <h1 className="text-2xl font-semibold text-neutral-900">Edit Event: {event.title}</h1>
      <EventEditorForm
        initialValues={initialValues}
        locations={locations.map((l) => ({ id: l.id, name: l.name, address: l.address, city: l.city, state: l.state }))}
        ticketTypes={event.ticketTypes.map((t) => ({
          id: t.id,
          name: t.name,
          priceMinorUnits: t.priceMinorUnits,
          currency: t.currency,
          capacity: t.capacity,
        }))}
        canPublish={hasPermission(session.adminUser.role, 'events:publish')}
      />
    </div>
  );
}
