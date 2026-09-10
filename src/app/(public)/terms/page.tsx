import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ContentPageBody } from '@/components/content-page-body';
import { getContentPage } from '@/server/services/content-service';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentPage('TERMS');
  return { title: page?.title ?? 'Terms of Service', description: page?.metaDescription ?? undefined };
}

export default async function TermsPage() {
  const page = await getContentPage('TERMS');
  if (!page) notFound();
  return <ContentPageBody title={page.title} body={page.body} />;
}
