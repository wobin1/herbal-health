import { Skeleton, TableSkeleton } from '@/components/admin/ui';

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-64" />
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-4 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-10 h-6 w-28" />
      <div className="mt-4 max-w-2xl">
        <TableSkeleton columns={3} rows={2} />
      </div>
      <Skeleton className="mt-10 h-6 w-28" />
      <div className="mt-4">
        <TableSkeleton columns={6} rows={4} />
      </div>
    </div>
  );
}
