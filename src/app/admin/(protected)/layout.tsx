import { redirect } from 'next/navigation';
import { ViewTransition } from 'react';
import { getAdminSession } from '@/lib/auth/require-admin';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <a
        href="#admin-main-content"
        className="bg-primary-950 focus:not-sr-only sr-only absolute left-2 top-2 z-50 rounded px-4 py-2 text-neutral-50"
      >
        Skip to main content
      </a>
      <AdminSidebar email={session.adminUser.email} />
      <main id="admin-main-content" className="px-6 py-10 lg:ml-64 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <ViewTransition default="none" enter="page-fade" exit="page-fade">
            {children}
          </ViewTransition>
        </div>
      </main>
    </div>
  );
}
