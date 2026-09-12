import { requirePermission } from '@/lib/auth/require-admin';
import { listAllLocations } from '@/server/services/location-service';
import { EventEditorForm } from '@/components/admin/event-editor-form';
import { hasPermission } from '@/lib/auth/rbac';
import { BackLink } from '@/components/admin/ui';

export default async function NewEventPage() {
  const session = await requirePermission('events:edit');
  const locations = await listAllLocations();

  return (
    <div>
      <BackLink href="/admin/events" label="Back to Events" />
      <h1 className="text-2xl font-semibold text-neutral-900">New Event</h1>
      <EventEditorForm
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        canPublish={hasPermission(session.adminUser.role, 'events:publish')}
      />
    </div>
  );
}
