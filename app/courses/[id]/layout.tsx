import type { Metadata } from 'next';
import Link from 'next/link';

const BASE = 'https://learn.biodockify.com';

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  updated_at?: string | null;
};

const HEADERS = () => ({
  apikey: process.env.SUPABASE_ANON_KEY || '',
  Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || ''}`,
});

async function courseMeta(id: string): Promise<CourseRow | null> {
  try {
    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/learning_courses?id=eq.${id}&select=id,title,description,category,updated_at`,
      { headers: HEADERS(), next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as CourseRow[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** Related courses: same category first, then any other published course. */
async function relatedCourses(course: CourseRow): Promise<CourseRow[]> {
  try {
    const same = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/learning_courses?is_published=eq.true&category=eq.${course.category}&id=neq.${course.id}&select=id,title,description,category&limit=3`,
      { headers: HEADERS(), next: { revalidate: 3600 } },
    );
    let rows: CourseRow[] = same.ok ? (await same.json()) : [];
    if (rows.length < 3) {
      const more = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/learning_courses?is_published=eq.true&id=neq.${course.id}&select=id,title,description,category&limit=8`,
        { headers: HEADERS(), next: { revalidate: 3600 } },
      );
      const extra = more.ok ? ((await more.json()) as CourseRow[]) : [];
      const seen = new Set(rows.map((r) => r.id));
      rows = [...rows, ...extra.filter((e) => !seen.has(e.id))].slice(0, 3);
    }
    return rows;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const course = await courseMeta(id);
  if (!course) {
    return { title: 'Course | BioDockify Learn' };
  }
  const title = `${course.title} — Free AI-Narrated Course | BioDockify Learn`;
  const description =
    (course.description || 'Learn with AI-narrated video lessons, hands-on practice and a certificate.') +
    ' Free course on BioDockify Learn.';
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/courses/${course.id}` },
    openGraph: {
      title,
      description,
      url: `${BASE}/courses/${course.id}`,
      siteName: 'BioDockify Learn',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
    other: { robots: 'index, follow' },
  };
}

export default async function CourseLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await courseMeta(id);
  const related = course ? await relatedCourses(course) : [];
  const jsonLd = course
    ? {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: course.title,
        description: course.description || 'AI-narrated course with hands-on practice.',
        provider: { '@type': 'Organization', name: 'BioDockify Learn', url: BASE },
        url: `${BASE}/courses/${course.id}`,
      }
    : null;
  const breadcrumbLd = course
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
          { '@type': 'ListItem', position: 2, name: 'Courses', item: `${BASE}/courses` },
          { '@type': 'ListItem', position: 3, name: course.title, item: `${BASE}/courses/${course.id}` },
        ],
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      ) : null}
      {breadcrumbLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      ) : null}
      {children}
      {course && related.length > 0 ? (
        <section className="max-w-5xl mx-auto px-4 pb-16">
          <nav className="text-sm text-neutral-400 mb-3">
            <Link href="/" className="hover:text-emerald-400">Home</Link>
            <span className="mx-2">›</span>
            <Link href="/courses" className="hover:text-emerald-400">Courses</Link>
            <span className="mx-2">›</span>
            <span className="text-neutral-300">{course.title}</span>
          </nav>
          <h2 className="text-xl font-semibold text-neutral-200 mb-4">Related courses</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/courses/${r.id}`}
                className="block p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-emerald-700 transition-colors"
              >
                <p className="font-medium text-neutral-100">{r.title}</p>
                <p className="text-sm text-neutral-400 mt-1 line-clamp-2">
                  {(r.description || '').slice(0, 90)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
