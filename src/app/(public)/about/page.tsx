import type { Metadata } from 'next';
import { FounderBioSection } from '@/components/founder-bio-section';
import { PageHero } from '@/components/page-hero';
import { ABOUT_CONTENT } from '@/lib/content/static-pages';

export const metadata: Metadata = {
  title: ABOUT_CONTENT.title,
};

export default function AboutPage() {
  return (
    <article>
      <PageHero
        badge="Herbal Health Seminar Series"
        heading="About Us"
        description="Learn about the naturopathic doctor and master herbalist behind our seminar series."
        imageSrc="https://images.unsplash.com/photo-1517705008128-361805f42e86?q=80&w=2000&auto=format&fit=crop"
      />
      <FounderBioSection
        title={ABOUT_CONTENT.title}
        body={ABOUT_CONTENT.body}
        imageSrc="/images/founder.webp"
        imageAlt="Founder of the Herbal Health Seminar Series"
        missionText="We are dedicated to preserving and sharing the ancient wisdom of herbal medicine. Our traveling seminars provide a professional, educational environment where participants can learn the foundational knowledge of plant-based wellness and traditional preparation methods. We believe in empowering adults with the tools to support their health through a natural, educational lens."
      />
    </article>
  );
}
