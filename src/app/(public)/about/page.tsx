import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ContentPageBody } from '@/components/content-page-body';
import { getContentPage } from '@/server/services/content-service';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentPage('ABOUT');
  return { title: page?.title ?? 'About', description: page?.metaDescription ?? undefined };
}

export default async function AboutPage() {
  const page = await getContentPage('ABOUT');
  if (!page) notFound();
  return <ContentPageBody title={page.title} body={page.body} />;
}
