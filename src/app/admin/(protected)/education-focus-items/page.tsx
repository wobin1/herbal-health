import { requirePermission } from '@/lib/auth/require-admin';
import { listEducationFocusItems } from '@/server/services/education-focus-item-service';
import { EducationFocusItemManager } from '@/components/admin/education-focus-item-manager';
import { parsePageParams } from '@/lib/pagination';

export default async function AdminEducationFocusItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePermission('educationFocusItems:manage');
  const params = await searchParams;
  const pageParams = parsePageParams(params);
  const { items, page, totalPages, total } = await listEducationFocusItems(pageParams);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">What You&apos;ll Learn</h1>
      <p className="mt-1 text-sm text-neutral-500">{total} total</p>
      <p className="mt-2 text-sm text-neutral-600">
        Manage the three homepage cards shown right after the hero section.
      </p>
      <div className="mt-8">
        <EducationFocusItemManager
          items={items}
          pagination={{ page, totalPages, total, basePath: '/admin/education-focus-items' }}
        />
      </div>
    </div>
  );
}
