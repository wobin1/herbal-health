'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LockIcon, UserIcon } from '@/components/icons';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <header
      style={{ viewTransitionName: 'site-header' }}
      className={
        isHome
          ? 'absolute inset-x-0 top-0 z-20 text-neutral-50'
          : 'bg-primary-950 relative text-neutral-50'
      }
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5">
        <Link href="/" className="group flex items-center">
          <span className="shadow-primary-950/40 rounded-full bg-neutral-50/10 p-1 shadow-lg backdrop-blur-sm transition-transform duration-base ease-premium group-hover:scale-105">
            <Image
              src="/herbal-logo.jpeg"
              alt="Herbal Health"
              width={160}
              height={160}
              className="h-16 w-16 rounded-full object-cover"
              priority
            />
          </span>
        </Link>

        <nav aria-label="Primary" className="order-3 w-full sm:order-none sm:w-auto">
          <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 rounded-full border border-neutral-50/15 bg-neutral-50/5 px-2 py-1.5 text-sm font-medium backdrop-blur sm:gap-x-1">
            {NAV_LINKS.map((link, index) => (
              <li key={link.href} className="flex items-center gap-x-2 sm:gap-x-1">
                {index > 0 ? <span className="text-neutral-50/30" aria-hidden="true">&bull;</span> : null}
                <Link
                  href={link.href}
                  className="rounded-full px-3 py-1 transition-colors duration-fast ease-premium hover:text-accent-500"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-50/20 px-5 py-2 text-sm font-medium transition-colors duration-fast ease-premium hover:border-neutral-50/40"
          >
            <UserIcon className="h-4 w-4" />
            Contact Us
          </Link>
          <Link
            href="/admin/login"
            aria-label="Admin login"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-50/20 text-neutral-50 transition-colors duration-fast ease-premium hover:border-neutral-50/40"
          >
            <LockIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
