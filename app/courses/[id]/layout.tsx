import type { Metadata } from 'next';

const BASE = 'https://learn.biodockify.com';

type CourseMeta = {
  id: string;
  title: string;
  description: string | null;
  updated_at?: string | null;
};

async function courseMeta(id: string): Promise<CourseMeta | null> {
  try {
    const key = process.env.SUPABASE_ANON_KEY || '';
    const url = process.env.SUPABASE_URL || '';
    if (!key || !url) return null;
    const res = await fetch(
      `${url}/rest/v1/learning_courses?id=eq.${id}&select=id,title,description,updated_at`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as CourseMeta[];
    return rows[0] ?? null;
  } catch {
    return null;
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
  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      {children}
    </>
  );
}
