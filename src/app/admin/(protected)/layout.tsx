import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/auth/require-admin';

const NAV_LINKS = [
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/locations', label: 'Locations' },
  { href: '/admin/instructors', label: 'Instructors' },
];

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
      <header className="bg-primary-950 text-neutral-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <Link href="/admin/events" className="font-semibold">
            Herbal Health Admin
          </Link>
          <nav aria-label="Admin" className="flex gap-4 text-sm">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-accent-500">
                {link.label}
              </Link>
            ))}
          </nav>
          <span className="text-sm text-neutral-50/70">{session.adminUser.email}</span>
        </div>
      </header>
      <main id="admin-main-content" className="mx-auto max-w-6xl px-6 py-10">
        {children}
      </main>
    </div>
  );
}
