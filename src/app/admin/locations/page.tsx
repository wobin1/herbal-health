import { requirePermission } from '@/lib/auth/require-admin';
import { listLocations } from '@/server/services/location-service';
import { LocationManager } from '@/components/admin/location-manager';

export default async function AdminLocationsPage() {
  await requirePermission('locations:manage');
  const locations = await listLocations();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Locations</h1>
      <div className="mt-8">
        <LocationManager locations={locations} />
      </div>
    </div>
  );
}
