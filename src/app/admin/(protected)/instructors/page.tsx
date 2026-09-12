import { requirePermission } from '@/lib/auth/require-admin';
import { listInstructors } from '@/server/services/instructor-service';
import { InstructorManager } from '@/components/admin/instructor-manager';
import { parsePageParams } from '@/lib/pagination';

export default async function AdminInstructorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePermission('instructors:manage');
  const params = await searchParams;
  const pageParams = parsePageParams(params);
  const { items: instructors, page, totalPages, total } = await listInstructors(pageParams);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Instructors</h1>
      <p className="mt-1 text-sm text-neutral-500">{total} total</p>
      <div className="mt-8">
        <InstructorManager
          instructors={instructors}
          pagination={{ page, totalPages, total, basePath: '/admin/instructors' }}
        />
      </div>
    </div>
  );
}
