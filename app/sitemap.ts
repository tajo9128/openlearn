import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

const BASE = 'https://learn.biodockify.com';

type CourseRow = { id: string; updated_at?: string | null };
type LessonRow = { id: string; title: string; classroom_id: string | null };

function slugForLesson(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'lesson'}--${id}`;
}

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

async function lessonsFor(courseIds: string[]): Promise<LessonRow[]> {
  try {
    const key = process.env.SUPABASE_ANON_KEY || '';
    const url = process.env.SUPABASE_URL || '';
    const filter = `course_id=in.(${courseIds.join(',')})&classroom_id=not.is.null`;
    const res = await fetch(`${url}/rest/v1/learning_lessons?${filter}&select=id,title&limit=2000`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return (await res.json()) as LessonRow[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/courses`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/catalog`, changeFrequency: 'weekly', priority: 0.8 },
  ];

  const courses = await publishedCourses();
  const coursePages: MetadataRoute.Sitemap = courses.map((c) => ({
    url: `${BASE}/courses/${c.id}`,
    lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const lessonRows = courses.length > 1 ? await lessonsFor(courses.map((c) => c.id)) : [];
  const lessonPages: MetadataRoute.Sitemap = lessonRows.map((l) => {
    const base = l.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    return {
      url: `${BASE}/learn/${base || 'lesson'}--${l.id}`,
      changeFrequency: 'monthly',
      priority: 0.7,
    };
  });

  return [...staticPages, ...coursePages, ...lessonPages];
}
