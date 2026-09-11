import type { MetadataRoute } from 'next';
import { listPublicEvents } from '@/server/services/event-service';

const STATIC_ROUTES = ['', '/about', '/contact', '/faq', '/terms', '/privacy', '/refund-policy', '/disclaimer', '/events'];

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const events = await listPublicEvents({});

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  const eventEntries: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${base}/events/${event.slug}`,
    lastModified: event.updatedAt,
  }));

  return [...staticEntries, ...eventEntries];
}
