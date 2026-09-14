import { ViewTransition } from 'react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { getHomepageContent } from '@/server/services/content-service';
import { getAdminSession } from '@/lib/auth/require-admin';

export default async function PublicLayout({ children }: LayoutProps<'/'>) {
  const [content, session] = await Promise.all([getHomepageContent(), getAdminSession()]);

  return (
    <>
      <a
        href="#main-content"
        className="bg-primary-950 focus:not-sr-only sr-only absolute left-2 top-2 z-50 rounded px-4 py-2 text-neutral-50"
      >
        Skip to main content
      </a>
      <SiteHeader isAdminLoggedIn={Boolean(session)} />
      <main id="main-content" className="flex-1">
        <ViewTransition default="none" enter="page-fade" exit="page-fade">
          {children}
        </ViewTransition>
      </main>
      <SiteFooter content={content} />
    </>
  );
}
