'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { SVGProps } from 'react';
import {
  BookOpenIcon,
  CalendarIcon,
  LogOutIcon,
  MailIcon,
  MapPinIcon,
  MenuIcon,
  ReceiptIcon,
  UsersIcon,
  XIcon,
} from '@/components/admin/icons';

type NavLink = {
  href: string;
  label: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
};

const NAV_LINKS: NavLink[] = [
  { href: '/admin/events', label: 'Events', icon: CalendarIcon },
  { href: '/admin/orders', label: 'Orders', icon: ReceiptIcon },
  { href: '/admin/locations', label: 'Locations', icon: MapPinIcon },
  { href: '/admin/instructors', label: 'Instructors', icon: UsersIcon },
  { href: '/admin/education-focus-items', label: "What You'll Learn", icon: BookOpenIcon },
  { href: '/admin/contact-messages', label: 'Contact Messages', icon: MailIcon },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-1 px-3">
      {NAV_LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-accent-500/15 text-accent-500'
                : 'text-neutral-50/75 hover:bg-neutral-50/10 hover:text-neutral-50'
            }`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-accent-500' : 'text-neutral-50/60'}`} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      router.push('/admin/login');
      router.refresh();
    }
  }

  const brand = (
    <Link href="/admin/events" className="flex items-center gap-3 px-3 py-2">
      <Image
        src="/herbal-logo.jpeg"
        alt="Herbal Health Admin"
        width={36}
        height={36}
        className="h-9 w-9 rounded-full object-cover"
        priority
      />
      <span className="text-sm font-semibold tracking-wide text-neutral-50">Herbal Health Admin</span>
    </Link>
  );

  const accountFooter = (
    <div className="border-t border-neutral-50/10 px-3 py-3">
      <div className="mb-2 truncate px-3 text-xs text-neutral-50/60">{email}</div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-50/75 transition-colors hover:bg-neutral-50/10 hover:text-neutral-50 disabled:opacity-60"
      >
        <LogOutIcon className="h-5 w-5 shrink-0 text-neutral-50/60" />
        {loggingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between bg-primary-950 px-4 py-3 text-neutral-50 lg:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          className="rounded-lg p-2 hover:bg-neutral-50/10"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-primary-950 py-4 shadow-xl">
            <div className="flex items-center justify-between px-3">
              {brand}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-neutral-50 hover:bg-neutral-50/10"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex flex-1 flex-col overflow-y-auto">
              <NavList pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
            {accountFooter}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col lg:bg-primary-950">
        <div className="border-b border-neutral-50/10 py-3">{brand}</div>
        <div className="flex flex-1 flex-col overflow-y-auto py-4">
          <NavList pathname={pathname} />
        </div>
        {accountFooter}
      </aside>
    </>
  );
}
