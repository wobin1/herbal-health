import Link from 'next/link';
import type { HomepageContent } from '@/server/services/content-service';

const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/disclaimer', label: 'Disclaimer' },
];

export function SiteFooter({ content }: { content: HomepageContent }) {
  return (
    <footer className="bg-primary-950 text-neutral-50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold">Herbal Health Seminar Series</h2>
            <p className="mt-2 text-sm text-neutral-100/80">{content.footerAboutText}</p>
          </div>
          <div>
            <h2 className="text-base font-semibold">Contact</h2>
            <p className="mt-2 text-sm text-neutral-100/80">
              <a href={`mailto:${content.footerContactEmail}`} className="hover:text-accent-500">
                {content.footerContactEmail}
              </a>
            </p>
            {content.footerContactPhone ? (
              <p className="text-sm text-neutral-100/80">{content.footerContactPhone}</p>
            ) : null}
          </div>
          <div>
            <h2 className="text-base font-semibold">Legal</h2>
            <ul className="mt-2 space-y-1 text-sm text-neutral-100/80">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-accent-500">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-8 text-xs text-neutral-100/60">
          &copy; {new Date().getFullYear()} Herbal Health Seminar Series. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
