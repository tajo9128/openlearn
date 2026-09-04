import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

const BASE = 'https://learn.biodockify.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private app areas: personalized dashboards/auth flows stay out of the index
        disallow: ['/dashboard', '/auth/', '/api/', '/admin', '/settings', '/profile'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
