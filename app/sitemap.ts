import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

const BASE = 'https://learn.biodockify.com';

type CourseRow = { id: string; updated_at?: string | null };

async function publishedCourses(): Promise<CourseRow[]> {
  try {
    const key = process.env.SUPABASE_ANON_KEY || '';
    const url = process.env.SUPABASE_URL || '';
    if (!key || !url) return [];
    const res = await fetch(`${url}/rest/v1/learning_courses?is_published=eq.true&select=id,updated_at`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return (await res.json()) as CourseRow[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/courses`, changeFrequency: 'daily', priority: 0.9 },
  ];

  const courses = await publishedCourses();
  const coursePages: MetadataRoute.Sitemap = courses.map((c) => ({
    url: `${BASE}/courses/${c.id}`,
    lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticPages, ...coursePages];
}
