'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCartIcon, UserIcon } from '@/components/icons';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <header
      className={
        isHome
          ? 'absolute inset-x-0 top-0 z-20 text-neutral-50'
          : 'bg-primary-950 relative text-neutral-50'
      }
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5">
        <Link href="/" className="flex items-center">
          <Image
            src="/herbal-logo.jpeg"
            alt="Herbal Health"
            width={160}
            height={160}
            className="h-14 w-14 rounded-full object-cover"
            priority
          />
        </Link>

        <nav aria-label="Primary" className="order-3 w-full sm:order-none sm:w-auto">
          <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 rounded-full border border-neutral-50/15 bg-neutral-50/5 px-2 py-1.5 text-sm font-medium backdrop-blur sm:gap-x-1">
            {NAV_LINKS.map((link, index) => (
              <li key={link.href} className="flex items-center gap-x-2 sm:gap-x-1">
                {index > 0 ? <span className="text-neutral-50/30" aria-hidden="true">&bull;</span> : null}
                <Link href={link.href} className="rounded-full px-3 py-1 hover:text-accent-500">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-50/20 px-5 py-2 text-sm font-medium hover:border-neutral-50/40"
          >
            <UserIcon className="h-4 w-4" />
            My Account
          </Link>
          <Link
            href="/"
            aria-label="Shopping cart"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-50/20 text-neutral-50 hover:border-neutral-50/40"
          >
            <ShoppingCartIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
