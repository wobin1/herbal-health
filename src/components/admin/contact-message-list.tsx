'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/confirm-dialog';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { InboxIcon } from '@/components/admin/icons';
import { EmptyState } from '@/components/admin/ui';

export interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ListPagination {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
}

export function ContactMessageList({
  messages,
  pagination,
}: {
  messages: ContactMessageRow[];
  pagination: ListPagination;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleMarkRead(id: string) {
    setError(null);
    const response = await fetch(`/api/admin/contact-messages/${id}`, { method: 'PATCH' });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error?.message ?? 'Unable to update message');
      return;
    }
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!(await confirm('Delete this message?'))) return;
    setError(null);
    const response = await fetch(`/api/admin/contact-messages/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error?.message ?? 'Unable to delete message');
      return;
    }
    router.refresh();
  }

  if (error) {
    return (
      <>
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
        {dialog}
      </>
    );
  }

  if (messages.length === 0) {
    return <EmptyState icon={<InboxIcon className="h-8 w-8" />} title="No messages yet" description="Messages submitted through the contact form will appear here." />;
  }

  const paginationNav = (
    <PaginationControls
      page={pagination.page}
      totalPages={pagination.totalPages}
      total={pagination.total}
      basePath={pagination.basePath}
    />
  );

  return (
    <>
      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      {messages.map((message) => {
        const isExpanded = expandedId === message.id;
        return (
          <li
            key={message.id}
            className={`group px-4 py-4 transition-colors hover:bg-neutral-50 ${!message.isRead ? 'bg-accent-500/[0.04]' : ''}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setExpandedId(isExpanded ? null : message.id);
                  if (!message.isRead) void handleMarkRead(message.id);
                }}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  {!message.isRead ? (
                    <span className="bg-accent-500 inline-block h-2 w-2 shrink-0 rounded-full" aria-hidden="true" />
                  ) : null}
                  <span className="font-medium text-neutral-900">{message.name}</span>
                  <span className="text-sm text-neutral-500">{message.email}</span>
                  {message.phone ? <span className="text-sm text-neutral-500">{message.phone}</span> : null}
                </div>
                <p className={`mt-1 text-sm text-neutral-600 ${isExpanded ? '' : 'truncate'}`}>{message.message}</p>
              </button>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <time dateTime={message.createdAt} className="text-neutral-500">
                  {new Date(message.createdAt).toLocaleDateString('en-US')}
                </time>
                <button
                  type="button"
                  onClick={() => handleDelete(message.id)}
                  className="font-medium text-red-700 opacity-0 underline-offset-2 transition-opacity duration-150 hover:underline group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        );
      })}
      </ul>
      {paginationNav}
      {dialog}
    </>
  );
}
