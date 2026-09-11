import { requirePermission } from '@/lib/auth/require-admin';
import { listLocations } from '@/server/services/location-service';
import { EventEditorForm } from '@/components/admin/event-editor-form';
import { hasPermission } from '@/lib/auth/rbac';

export default async function NewEventPage() {
  const session = await requirePermission('events:edit');
  const locations = await listLocations();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">New Event</h1>
      <EventEditorForm
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        canPublish={hasPermission(session.adminUser.role, 'events:publish')}
      />
    </div>
  );
}
