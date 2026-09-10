import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ContentPageBody } from '@/components/content-page-body';
import { getContentPage } from '@/server/services/content-service';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentPage('PRIVACY');
  return { title: page?.title ?? 'Privacy Policy', description: page?.metaDescription ?? undefined };
}

export default async function PrivacyPage() {
  const page = await getContentPage('PRIVACY');
  if (!page) notFound();
  return <ContentPageBody title={page.title} body={page.body} />;
}
