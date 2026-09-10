import { prisma } from '@/lib/db/client';
import type { ContentPageSlug } from '@prisma/client';

const PUBLICLY_VISIBLE_EVENT_STATUSES = ['COMING_SOON', 'PUBLISHED', 'ON_SALE', 'SOLD_OUT'] as const;

const DEFAULT_HOMEPAGE_CONTENT = {
  heroHeading: 'Herbal Health Seminar Series',
  heroSubheading:
    'Practical, evidence-informed education on herbal health — led by experienced instructors, in cities near you.',
  heroCtaLabel: 'View Upcoming Seminars',
  heroCtaHref: '/events',
  missionHeading: 'Education You Can Trust',
  missionBody:
    'We bring accessible, well-researched herbal health education to communities, helping people make informed decisions about natural wellness.',
  finalCtaHeading: 'Ready to Learn More?',
  finalCtaBody: 'Reserve your seat at an upcoming seminar and join thousands of past attendees.',
  finalCtaLabel: 'Register Now',
  finalCtaHref: '/events',
  footerAboutText:
    'Herbal Health Seminar Series hosts educational events on natural wellness across the country.',
  footerContactEmail: 'hello@herbalhealthseminars.com',
  footerContactPhone: null as string | null,
};

export type HomepageContent = typeof DEFAULT_HOMEPAGE_CONTENT;

export async function getHomepageContent(): Promise<HomepageContent> {
  const stored = await prisma.homepageContent.findFirst();
  if (!stored) return DEFAULT_HOMEPAGE_CONTENT;
  return stored;
}

export async function getPublishedFaqs() {
  return prisma.fAQ.findMany({
    where: { published: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getFeaturedInstructors() {
  return prisma.instructor.findMany({
    where: { published: true, isFeatured: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getPublishedEducationalFocusItems() {
  return prisma.educationalFocusItem.findMany({
    where: { published: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getFeaturedEvents() {
  return prisma.event.findMany({
    where: {
      isFeatured: true,
      status: { in: [...PUBLICLY_VISIBLE_EVENT_STATUSES] },
    },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getContentPage(slug: ContentPageSlug) {
  const page = await prisma.contentPage.findUnique({ where: { slug } });
  if (!page || !page.published) return null;
  return page;
}
