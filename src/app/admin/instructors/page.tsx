import { requirePermission } from '@/lib/auth/require-admin';
import { listInstructors } from '@/server/services/instructor-service';
import { InstructorManager } from '@/components/admin/instructor-manager';

export default async function AdminInstructorsPage() {
  await requirePermission('instructors:manage');
  const instructors = await listInstructors();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Instructors</h1>
      <div className="mt-8">
        <InstructorManager instructors={instructors} />
      </div>
    </div>
  );
}
