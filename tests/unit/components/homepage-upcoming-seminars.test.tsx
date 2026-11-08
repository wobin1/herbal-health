import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock('@/components/motion/reveal', () => ({
  Reveal: ({ as: Tag = 'div', children, className }: { as?: 'li' | 'div'; children: React.ReactNode; className?: string }) => (
    <Tag className={className}>{children}</Tag>
  ),
}));

const { HomepageUpcomingSeminars } = await import('@/components/homepage-upcoming-seminars');

const BASE = {
  id: 'evt-1',
  slug: 'herbal-foundations',
  title: 'Herbal Foundations',
  city: 'Portland',
  state: 'OR',
  startAt: new Date('2026-12-06T15:54:00Z'),
};

describe('HomepageUpcomingSeminars', () => {
  it("shows the event's cover image as decorative (the title is right beside it)", () => {
    const { container } = render(
      <HomepageUpcomingSeminars events={[{ ...BASE, coverImageUrl: 'https://res.cloudinary.com/x/cover.jpg' }]} />,
    );
    const img = container.querySelector('li img[src="https://res.cloudinary.com/x/cover.jpg"]');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('alt', '');
  });

  it('renders a placeholder instead of an image when the event has no cover image', () => {
    const { container } = render(<HomepageUpcomingSeminars events={[{ ...BASE, coverImageUrl: null }]} />);
    expect(container.querySelector('li img')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Herbal Foundations' })).toBeInTheDocument();
  });
});
