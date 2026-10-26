import { requirePermission } from '@/lib/auth/require-admin';
import { listAdminUsers, listPendingInvites } from '@/server/services/admin-user-service';
import { AdminUserManager } from '@/components/admin/admin-user-manager';
import { parsePageParams } from '@/lib/pagination';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requirePermission('users:manage');
  const params = await searchParams;
  const pageParams = parsePageParams(params);
  const [{ items: users, page, totalPages, total }, invites] = await Promise.all([
    listAdminUsers(pageParams),
    listPendingInvites(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Admin Users</h1>
      <p className="mt-1 text-sm text-neutral-500">{total} total</p>
      <div className="mt-8">
        <AdminUserManager
          users={users.map((user) => ({
            ...user,
            lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
          }))}
          invites={invites.map((invite) => ({ ...invite, expiresAt: invite.expiresAt.toISOString() }))}
          currentUserId={session.adminUser.id}
          pagination={{ page, totalPages, total, basePath: '/admin/users' }}
        />
      </div>
    </div>
  );
}
