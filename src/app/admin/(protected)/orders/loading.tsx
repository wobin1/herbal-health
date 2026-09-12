import { Skeleton, TableSkeleton } from '@/components/admin/ui';

export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-2 h-4 w-16" />
        </div>
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <Skeleton className="h-16 w-48" />
        <Skeleton className="h-16 w-40" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="mt-8">
        <TableSkeleton columns={7} />
      </div>
    </div>
  );
}
