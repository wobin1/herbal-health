import { requirePermission } from '@/lib/auth/require-admin';
import { listLocations } from '@/server/services/location-service';
import { LocationManager } from '@/components/admin/location-manager';
import { parsePageParams } from '@/lib/pagination';

export default async function AdminLocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePermission('locations:manage');
  const params = await searchParams;
  const pageParams = parsePageParams(params);
  const { items: locations, page, totalPages, total } = await listLocations(pageParams);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Locations</h1>
      <p className="mt-1 text-sm text-neutral-500">{total} total</p>
      <div className="mt-8">
        <LocationManager
          locations={locations}
          pagination={{ page, totalPages, total, basePath: '/admin/locations' }}
        />
      </div>
    </div>
  );
}
