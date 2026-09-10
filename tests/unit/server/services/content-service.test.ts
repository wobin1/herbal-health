import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
  homepageContent: { findFirst: vi.fn() },
  fAQ: { findMany: vi.fn() },
  instructor: { findMany: vi.fn() },
  educationalFocusItem: { findMany: vi.fn() },
  event: { findMany: vi.fn() },
  contentPage: { findUnique: vi.fn() },
};

vi.mock('@/lib/db/client', () => ({ prisma: prismaMock }));

const {
  getHomepageContent,
  getPublishedFaqs,
  getFeaturedInstructors,
  getPublishedEducationalFocusItems,
  getFeaturedEvents,
  getContentPage,
} = await import('@/server/services/content-service');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getHomepageContent', () => {
  it('returns the stored homepage content when present', async () => {
    prismaMock.homepageContent.findFirst.mockResolvedValue({ heroHeading: 'Custom Hero' });
    const content = await getHomepageContent();
    expect(content.heroHeading).toBe('Custom Hero');
  });

  it('falls back to default copy when no row exists yet', async () => {
    prismaMock.homepageContent.findFirst.mockResolvedValue(null);
    const content = await getHomepageContent();
    expect(content.heroHeading).toBeTruthy();
    expect(content.heroCtaHref).toBeTruthy();
  });
});

describe('getPublishedFaqs', () => {
  it('queries only published FAQs ordered by sortOrder', async () => {
    prismaMock.fAQ.findMany.mockResolvedValue([]);
    await getPublishedFaqs();
    expect(prismaMock.fAQ.findMany).toHaveBeenCalledWith({
      where: { published: true },
      orderBy: { sortOrder: 'asc' },
    });
  });
});

describe('getFeaturedInstructors', () => {
  it('queries only published, featured instructors ordered by sortOrder', async () => {
    prismaMock.instructor.findMany.mockResolvedValue([]);
    await getFeaturedInstructors();
    expect(prismaMock.instructor.findMany).toHaveBeenCalledWith({
      where: { published: true, isFeatured: true },
      orderBy: { sortOrder: 'asc' },
    });
  });
});

describe('getPublishedEducationalFocusItems', () => {
  it('queries only published items ordered by sortOrder', async () => {
    prismaMock.educationalFocusItem.findMany.mockResolvedValue([]);
    await getPublishedEducationalFocusItems();
    expect(prismaMock.educationalFocusItem.findMany).toHaveBeenCalledWith({
      where: { published: true },
      orderBy: { sortOrder: 'asc' },
    });
  });
});

describe('getFeaturedEvents', () => {
  it('queries only featured, publicly visible events ordered by sortOrder', async () => {
    prismaMock.event.findMany.mockResolvedValue([]);
    await getFeaturedEvents();
    expect(prismaMock.event.findMany).toHaveBeenCalledWith({
      where: {
        isFeatured: true,
        status: { in: ['COMING_SOON', 'PUBLISHED', 'ON_SALE', 'SOLD_OUT'] },
      },
      orderBy: { sortOrder: 'asc' },
    });
  });
});

describe('getContentPage', () => {
  it('returns null when the page is not published', async () => {
    prismaMock.contentPage.findUnique.mockResolvedValue({ published: false, title: 'X', body: 'Y' });
    const page = await getContentPage('ABOUT');
    expect(page).toBeNull();
  });

  it('returns the page when published', async () => {
    prismaMock.contentPage.findUnique.mockResolvedValue({ published: true, title: 'About', body: 'Body' });
    const page = await getContentPage('ABOUT');
    expect(page?.title).toBe('About');
  });

  it('returns null when the page does not exist', async () => {
    prismaMock.contentPage.findUnique.mockResolvedValue(null);
    const page = await getContentPage('CONTACT');
    expect(page).toBeNull();
  });
});
