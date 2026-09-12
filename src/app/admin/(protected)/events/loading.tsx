import { Skeleton, TableSkeleton } from '@/components/admin/ui';

export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-16" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <div className="mt-8">
        <TableSkeleton columns={9} />
      </div>
    </div>
  );
}
