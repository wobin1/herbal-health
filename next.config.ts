import type { NextConfig } from 'next';
import { ALLOWED_IMAGE_HOSTS } from './src/lib/image-hosts';

const nextConfig: NextConfig = {
  // Dev only: lets pages served through a Cloudflare quick tunnel (used for Stripe webhook testing) load dev resources.
  allowedDevOrigins: ['*.trycloudflare.com'],
  images: {
    remotePatterns: ALLOWED_IMAGE_HOSTS.map((hostname) => ({
      protocol: 'https' as const,
      hostname,
    })),
  },
};

export default nextConfig;
