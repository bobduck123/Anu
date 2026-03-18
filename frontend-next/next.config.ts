import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

const coreApiOrigin =
  process.env.CORE_API_ORIGIN ||
  process.env.BACKEND_ORIGIN ||
  process.env.NEXT_PUBLIC_API_BASE;

const impactApiOrigin =
  process.env.MEMETICS_API_ORIGIN ||
  process.env.IMPACT_API_ORIGIN ||
  process.env.NEXT_PUBLIC_MEMETICS_API_BASE ||
  process.env.NEXT_PUBLIC_IMPACT_API_BASE;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Image optimization for faster loading
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 year
    remotePatterns: [
      { protocol: 'https', hostname: '**.anu.eco' },
      { protocol: 'https', hostname: '**.vercel.app' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  
  // Bundle optimizations for faster cold starts
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'framer-motion',
      '@radix-ui/react-icons',
      'gsap',
    ],
  },
  
  turbopack: {
    root: __dirname,
  },
  
  async rewrites() {
    const rules = [];

    if (coreApiOrigin) {
      rules.push({
        source: '/_core/:path*',
        destination: `${trimTrailingSlash(coreApiOrigin)}/:path*`,
      });
    }

    if (impactApiOrigin) {
      rules.push({
        source: '/_impact/:path*',
        destination: `${trimTrailingSlash(impactApiOrigin)}/:path*`,
      });
    }

    return rules;
  },
};

export default withNextIntl(nextConfig);
