import { requirePermission } from '@/lib/auth/require-admin';
import { listGalleryImages } from '@/server/services/gallery-service';
import { GalleryManager } from '@/components/admin/gallery-manager';
import { parsePageParams } from '@/lib/pagination';

export default async function AdminGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePermission('gallery:manage');
  const params = await searchParams;
  const pageParams = parsePageParams(params);
  const { items, page, totalPages, total } = await listGalleryImages(pageParams);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Gallery</h1>
      <p className="mt-1 text-sm text-neutral-500">{total} total</p>
      <p className="mt-2 text-sm text-neutral-600">
        Manage the images shown on the public gallery page.
      </p>
      <div className="mt-8">
        <GalleryManager
          images={items}
          pagination={{ page, totalPages, total, basePath: '/admin/gallery' }}
        />
      </div>
    </div>
  );
}
