import type { Metadata } from 'next';
import { listPublishedGalleryImages } from '@/server/services/gallery-service';
import { PageHero } from '@/components/page-hero';
import { GalleryLightbox } from '@/components/gallery-lightbox';
import { EmptyState } from '@/components/admin/ui';
import { ImageIcon } from '@/components/admin/icons';

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'Photos from Herbal Health Seminar Series events and workshops.',
};

export default async function GalleryPage() {
  const images = await listPublishedGalleryImages();

  return (
    <div className="bg-neutral-50">
      <PageHero
        badge="Herbal Health Seminar Series"
        heading="Gallery"
        description="Moments from our seminars, workshops, and community events."
        imageSrc="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2000&auto=format&fit=crop"
      />

      <section className="mx-auto max-w-6xl px-6 py-16">
        {images.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="h-8 w-8" />}
            title="No photos yet"
            description="Check back soon — we'll be sharing photos from upcoming seminars and events."
          />
        ) : (
          <GalleryLightbox
            images={images.map((image) => ({ id: image.id, url: image.url, caption: image.caption }))}
          />
        )}
      </section>
    </div>
  );
}
