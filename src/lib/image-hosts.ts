export const ALLOWED_IMAGE_HOSTS = [
  'picsum.photos',
  'fastly.picsum.photos',
  'images.unsplash.com',
  'placehold.co',
  'static.wixstatic.com',
  'res.cloudinary.com',
] as const;

export function isAllowedImageUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && (ALLOWED_IMAGE_HOSTS as readonly string[]).includes(hostname);
  } catch {
    return false;
  }
}
