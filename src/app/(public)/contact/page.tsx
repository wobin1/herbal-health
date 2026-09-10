import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ContentPageBody } from '@/components/content-page-body';
import { getContentPage } from '@/server/services/content-service';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentPage('CONTACT');
  return { title: page?.title ?? 'Contact', description: page?.metaDescription ?? undefined };
}

export default async function ContactPage() {
  const page = await getContentPage('CONTACT');
  if (!page) notFound();
  return <ContentPageBody title={page.title} body={page.body} />;
}
