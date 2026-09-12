import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@/components/admin/icons';

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      {label}
    </Link>
  );
}

/**
 * Shared table styling so every admin list (events, orders, locations, etc.)
 * gets the same density, sticky header, hover state, and border treatment.
 */
export const tableShellClassName = 'overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm';
export const tableClassName = 'w-full border-collapse text-left text-sm';
export const theadClassName = 'sticky top-0 z-10 bg-neutral-50/95 backdrop-blur-sm';
export const thClassName = 'px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500';
export const thNumClassName = `${thClassName} text-right`;
export const trClassName = 'group border-b border-neutral-100 last:border-0 transition-colors hover:bg-neutral-50';
export const tdClassName = 'px-4 py-3 align-middle text-neutral-600';
export const tdNumClassName = `${tdClassName} text-right tabular-nums`;
export const tdPrimaryClassName = 'px-4 py-3 align-middle font-medium text-neutral-900';

/** Actions cell that only appears on row hover/focus, so dense tables stay quiet at rest. */
export const rowActionsClassName =
  'flex items-center justify-end gap-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-neutral-200 ${className}`} />;
}

export function TableSkeleton({
  columns,
  rows = 6,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <div className={tableShellClassName}>
      <table className={tableClassName}>
        <thead className={theadClassName}>
          <tr className="border-b border-neutral-200">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className={thClassName}>
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-neutral-100 last:border-0">
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="px-4 py-3.5">
                  <Skeleton className="h-4 w-full max-w-[10rem]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/60 px-6 py-14 text-center">
      {icon ? <div className="text-neutral-400">{icon}</div> : null}
      <div>
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        {description ? <p className="mt-1 text-sm text-neutral-500">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  // order lifecycle
  PAID: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  EXPIRED: 'bg-neutral-100 text-neutral-600 ring-neutral-500/20',
  CANCELLED: 'bg-red-50 text-red-700 ring-red-600/20',
  REFUNDED: 'bg-red-50 text-red-700 ring-red-600/20',
  // event lifecycle
  DRAFT: 'bg-neutral-100 text-neutral-600 ring-neutral-500/20',
  PUBLISHED: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  ON_SALE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  SOLD_OUT: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  COMPLETED: 'bg-neutral-100 text-neutral-600 ring-neutral-500/20',
};

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-neutral-100 text-neutral-600 ring-neutral-500/20';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style}`}>
      {toTitleCase(status)}
    </span>
  );
}
