import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Presence Studio Console',
    short_name: 'Presence',
    description: 'Mobile-first owner console for Presence portfolio pages.',
    start_url: '/app',
    scope: '/app',
    display: 'standalone',
    background_color: '#1e0227',
    theme_color: '#1e0227',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
