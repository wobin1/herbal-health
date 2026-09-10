import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ContentPageBody } from '@/components/content-page-body';
import { getContentPage } from '@/server/services/content-service';

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentPage('REFUND_POLICY');
  return { title: page?.title ?? 'Refund Policy', description: page?.metaDescription ?? undefined };
}

export default async function RefundPolicyPage() {
  const page = await getContentPage('REFUND_POLICY');
  if (!page) notFound();
  return <ContentPageBody title={page.title} body={page.body} />;
}
