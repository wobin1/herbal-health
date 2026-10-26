'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/confirm-dialog';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { UsersIcon } from '@/components/admin/icons';
import { AdminModal } from '@/components/admin/admin-modal';
import {
  ButtonSpinner,
  EmptyState,
  StatusBadge,
  rowActionsClassName,
  tableClassName,
  tableShellClassName,
  tdClassName,
  tdPrimaryClassName,
  theadClassName,
  thClassName,
  trClassName,
} from '@/components/admin/ui';
import { toastError, toastSuccess } from '@/components/toast/use-toast';

type Role = 'ADMIN' | 'CONTENT_EDITOR';

export interface AdminUserRow {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface PendingInviteRow {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
}

type FormState = { id: string | null; email: string; role: Role; password: string };

const EMPTY: FormState = { id: null, email: '', role: 'CONTENT_EDITOR', password: '' };

const ROLE_LABELS: Record<Role, string> = { ADMIN: 'Admin', CONTENT_EDITOR: 'Content editor' };

const fieldClassName =
  'mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm transition-colors focus:border-primary-950 focus:outline-none focus:ring-2 focus:ring-primary-950/30';

export function AdminUserManager({
  users,
  invites,
  currentUserId,
  pagination,
}: {
  users: AdminUserRow[];
  invites: PendingInviteRow[];
  currentUserId: string;
  pagination: { page: number; totalPages: number; total: number; basePath: string };
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const isEditing = form.id !== null;
  const editingSelf = form.id === currentUserId;

  function openAddModal() {
    setError(null);
    setForm(EMPTY);
    setIsOpen(true);
  }

  function editItem(user: AdminUserRow) {
    setError(null);
    setForm({ id: user.id, email: user.email, role: user.role, password: '' });
    setIsOpen(true);
  }

  async function send(url: string, method: 'POST' | 'PATCH' | 'DELETE', payload: unknown, failure: string) {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error?.message ?? failure;
      setError(message);
      toastError(failure, message);
      return false;
    }
    return true;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      let ok: boolean;
      if (isEditing) {
        const original = users.find((u) => u.id === form.id);
        const payload: { role?: Role; password?: string } = {};
        if (!editingSelf && original && original.role !== form.role) payload.role = form.role;
        if (form.password) payload.password = form.password;
        if (Object.keys(payload).length === 0) {
          setIsOpen(false);
          return;
        }
        ok = await send(`/api/admin/users/${form.id}`, 'PATCH', payload, 'Unable to save user');
      } else {
        ok = await send(
          '/api/admin/users',
          'POST',
          { email: form.email, role: form.role },
          'Unable to send invitation',
        );
      }
      if (!ok) return;
      setIsOpen(false);
      toastSuccess(isEditing ? 'User saved' : 'Invitation sent');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function resendInvite(invite: PendingInviteRow) {
    setError(null);
    const ok = await send(
      '/api/admin/users',
      'POST',
      { email: invite.email, role: invite.role },
      'Unable to resend invitation',
    );
    if (!ok) return;
    toastSuccess('Invitation resent');
    router.refresh();
  }

  async function revokeInvite(invite: PendingInviteRow) {
    if (!(await confirm(`Revoke the invitation for ${invite.email}?`))) return;
    setError(null);
    const ok = await send(`/api/admin/user-invites/${invite.id}`, 'DELETE', undefined, 'Unable to revoke invitation');
    if (!ok) return;
    toastSuccess('Invitation revoked');
    router.refresh();
  }

  async function toggleActive(user: AdminUserRow) {
    const next = !user.isActive;
    if (!next && !(await confirm(`Deactivate ${user.email}? They will be signed out immediately.`))) return;
    setError(null);
    const ok = await send(
      `/api/admin/users/${user.id}`,
      'PATCH',
      { isActive: next },
      next ? 'Unable to reactivate user' : 'Unable to deactivate user',
    );
    if (!ok) return;
    toastSuccess(next ? 'User reactivated' : 'User deactivated');
    router.refresh();
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openAddModal}
          className="rounded-full bg-primary-950 px-6 py-2 text-sm font-medium text-neutral-50 transition-colors hover:bg-primary-900"
        >
          Invite User
        </button>
      </div>
      {error && !isOpen ? (
        <p role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {users.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<UsersIcon className="h-8 w-8" />}
            title="No admin users yet"
            description="Invite someone by email to give them access to the dashboard."
          />
        </div>
      ) : (
        <div className={`${tableShellClassName} mt-4 overflow-x-auto`}>
          <table className={`${tableClassName} min-w-[640px]`}>
            <thead className={theadClassName}>
              <tr className="border-b border-neutral-200">
                <th scope="col" className={thClassName}>Email</th>
                <th scope="col" className={thClassName}>Role</th>
                <th scope="col" className={thClassName}>Status</th>
                <th scope="col" className={thClassName}>Last sign-in</th>
                <th scope="col" className={thClassName}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <tr key={user.id} className={trClassName}>
                    <td className={tdPrimaryClassName}>
                      {user.email}
                      {isSelf ? <span className="ml-2 text-xs font-normal text-neutral-500">(you)</span> : null}
                    </td>
                    <td className={tdClassName}>{ROLE_LABELS[user.role]}</td>
                    <td className={tdClassName}>
                      <StatusBadge status={user.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td className={tdClassName}>
                      {user.lastLoginAt ? (
                        <time dateTime={user.lastLoginAt}>
                          {new Date(user.lastLoginAt).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: 'UTC',
                          })}{' '}
                          UTC
                        </time>
                      ) : (
                        'Never'
                      )}
                    </td>
                    <td className={tdClassName}>
                      <div className={rowActionsClassName}>
                        <button
                          type="button"
                          onClick={() => editItem(user)}
                          className="text-sm font-medium text-primary-950 underline-offset-2 hover:underline"
                        >
                          Edit
                        </button>
                        {isSelf ? null : (
                          <button
                            type="button"
                            onClick={() => toggleActive(user)}
                            className={`text-sm font-medium underline-offset-2 hover:underline ${
                              user.isActive ? 'text-red-700' : 'text-primary-950'
                            }`}
                          >
                            {user.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {invites.length > 0 ? (
        <section aria-labelledby="pending-invites-title" className="mt-10">
          <h2 id="pending-invites-title" className="text-lg font-semibold text-neutral-900">
            Pending invitations
          </h2>
          <div className={`${tableShellClassName} mt-4 overflow-x-auto`}>
            <table className={`${tableClassName} min-w-[560px]`}>
              <thead className={theadClassName}>
                <tr className="border-b border-neutral-200">
                  <th scope="col" className={thClassName}>Email</th>
                  <th scope="col" className={thClassName}>Role</th>
                  <th scope="col" className={thClassName}>Expires</th>
                  <th scope="col" className={thClassName}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} className={trClassName}>
                    <td className={tdPrimaryClassName}>{invite.email}</td>
                    <td className={tdClassName}>{ROLE_LABELS[invite.role]}</td>
                    <td className={tdClassName}>
                      <time dateTime={invite.expiresAt}>
                        {new Date(invite.expiresAt).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                          timeZone: 'UTC',
                        })}{' '}
                        UTC
                      </time>
                    </td>
                    <td className={tdClassName}>
                      <div className={rowActionsClassName}>
                        <button
                          type="button"
                          onClick={() => resendInvite(invite)}
                          className="text-sm font-medium text-primary-950 underline-offset-2 hover:underline"
                        >
                          Resend
                        </button>
                        <button
                          type="button"
                          onClick={() => revokeInvite(invite)}
                          className="text-sm font-medium text-red-700 underline-offset-2 hover:underline"
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        basePath={pagination.basePath}
      />

      <AdminModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onExited={() => setForm(EMPTY)}
        labelledBy="user-modal-title"
        className="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          <h2 id="user-modal-title" className="pr-8 text-xl font-semibold tracking-tight text-neutral-900">
            {isEditing ? 'Edit User' : 'Invite User'}
          </h2>
          {error ? (
            <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          <div>
            <label htmlFor="user-email" className="block text-sm font-medium text-neutral-900">
              Email<span aria-hidden="true"> *</span>
            </label>
            <input
              id="user-email"
              type="email"
              autoComplete="off"
              required
              disabled={isEditing}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={`${fieldClassName} disabled:bg-neutral-100 disabled:text-neutral-500`}
            />
          </div>
          <div>
            <label htmlFor="user-role" className="block text-sm font-medium text-neutral-900">
              Role
            </label>
            <select
              id="user-role"
              value={form.role}
              disabled={editingSelf}
              aria-describedby={editingSelf ? 'user-role-hint' : undefined}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
              className={`${fieldClassName} disabled:bg-neutral-100 disabled:text-neutral-500`}
            >
              <option value="CONTENT_EDITOR">Content editor — manages events and site content</option>
              <option value="ADMIN">Admin — full access, including orders, refunds and users</option>
            </select>
            {editingSelf ? (
              <p id="user-role-hint" className="mt-1 text-xs text-neutral-500">
                You can&apos;t change your own role.
              </p>
            ) : null}
          </div>
          {isEditing ? (
          <div>
            <label htmlFor="user-password" className="block text-sm font-medium text-neutral-900">
              New password
            </label>
            <input
              id="user-password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              aria-describedby="user-password-hint"
              className={fieldClassName}
            />
            <p id="user-password-hint" className="mt-1 text-xs text-neutral-500">
              Leave blank to keep the current password. At least 12 characters; setting one signs the user out everywhere.
            </p>
          </div>
          ) : (
            <p className="text-sm text-neutral-600">
              They&apos;ll get an email with a link, valid for 72 hours, to set their own password.
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-primary-950 px-6 py-2 text-sm font-medium text-neutral-50 transition-colors duration-fast ease-premium hover:bg-primary-900 disabled:opacity-50"
            >
              {submitting ? <ButtonSpinner /> : null}
              {isEditing ? 'Save Changes' : 'Send Invitation'}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-neutral-300 px-6 py-2 text-sm font-medium text-neutral-700 transition-colors duration-fast ease-premium hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </AdminModal>
      {dialog}
    </div>
  );
}
