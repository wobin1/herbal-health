import { Skeleton, TableSkeleton } from '@/components/admin/ui';

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-2 h-4 w-16" />
      <div className="mt-8">
        <div className="flex justify-end">
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
        <div className="mt-4">
          <TableSkeleton columns={4} />
        </div>
      </div>
    </div>
  );
}
