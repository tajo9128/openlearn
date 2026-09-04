import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const BASE = 'https://learn.biodockify.com';

// Always render fresh: a transient upstream failure must not cache a 404 for a real lesson.
export const dynamic = "force-dynamic";

type LessonRow = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  duration_minutes: number | null;
  course_id: string;
};

type CourseRow = { id: string; title: string; is_published: boolean | null };

const HEADERS = () => ({
  apikey: process.env.SUPABASE_ANON_KEY || '',
  Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || ''}`,
});

/** slug format: "{title-slug}--{lesson-uuid}" — the uuid suffix resolves uniquely. */
function lessonIdFromSlug(slug: string): string | null {
  const m = slug.match(/--([0-9a-fA-F-]{36})$/);
  return m ? m[1] : null;
}

export function slugForLesson(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'lesson'}--${id}`;
}

async function getData(lessonId: string) {
  try {
    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/learning_lessons?id=eq.${lessonId}&select=id,title,description,content,duration_minutes,course_id`,
      { headers: HEADERS(), next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as LessonRow[];
    const lesson = rows[0];
    if (!lesson) return null;
    const cres = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/learning_courses?id=eq.${lesson.course_id}&select=id,title,is_published`,
      { headers: HEADERS(), next: { revalidate: 86400 } },
    );
    const courseRows = (await cres.json()) as CourseRow[];
    const course = courseRows[0];
    if (!course || !course.is_published) return null;
    return { lesson, course };
  } catch {
    return null;
  }
}

function htmlToSections(html: string): { heading: string; paragraphs: string[] }[] {
  const sections: { heading: string; paragraphs: string[] }[] = [];
  const headingRe = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const marks: { pos: number; end: number; text: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(html))) {
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    if (text) marks.push({ pos: match.index, end: match.index + match[0].length, text });
  }
  if (marks.length === 0) {
    const plain = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return [{ heading: 'Overview', paragraphs: plain ? [plain] : [] }];
  }
  for (let i = 0; i < marks.length; i++) {
    const body = html.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].pos : html.length);
    const plain = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    sections.push({ heading: marks[i].text, paragraphs: plain ? [plain] : [] });
  }
  return sections;
}

function stripTags(html: string): string {
  return html
    .replace(/<pre[\s\S]*?<\/pre>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const lessonId = lessonIdFromSlug(slug);
  if (!lessonId) return { title: 'Topic | BioDockify Learn' };
  const data = await getData(lessonId);
  if (!data) return { title: 'Topic | BioDockify Learn' };
  const title = `${data.lesson.title} — Explained Simply | BioDockify Learn`;
  const description =
    stripTags(data.lesson.description || '') ||
    stripTags(data.lesson.content || '').slice(0, 155) ||
    'Learn this topic free with an AI-narrated lesson on BioDockify Learn.';
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/learn/${slug}` },
    openGraph: { title, description, url: `${BASE}/learn/${slug}`, type: 'article' },
  };
}

export default async function LearnTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lessonId = lessonIdFromSlug(slug);
  if (!lessonId) notFound();
  const data = await getData(lessonId);
  if (!data) notFound();
  const { lesson, course } = data;
  const sections = htmlToSections(lesson.content || '');
  const intro = stripTags(lesson.description || '');

  // Related lessons from the same course (internal links)
  let related: { slug: string; title: string }[] = [];
  try {
    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/learning_lessons?course_id=eq.${lesson.course_id}&id=neq.${lesson.id}&select=id,title&limit=6`,
      { headers: HEADERS(), next: { revalidate: 86400 } },
    );
    if (res.ok) {
      const rows = (await res.json()) as { id: string; title: string }[];
      related = rows.map((r) => ({ slug: slugForLesson(r.title, r.id), title: r.title }));
    }
  } catch {
    // related links are optional
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <article className="max-w-3xl mx-auto px-4 py-12">
        <nav className="text-sm text-neutral-400 mb-6">
          <Link href="/" className="hover:text-emerald-400">Home</Link>
          <span className="mx-2">›</span>
          <Link href="/courses" className="hover:text-emerald-400">Courses</Link>
          <span className="mx-2">›</span>
          <Link href={`/courses/${course.id}`} className="hover:text-emerald-400">{course.title}</Link>
        </nav>

        <p className="text-emerald-400 font-medium mb-2">Lesson · {lesson.duration_minutes ?? 40} min · Free</p>
        <h1 className="text-4xl font-bold mb-4">{lesson.title}</h1>
        {intro ? <p className="text-lg text-neutral-300 mb-8">{intro}</p> : null}

        {sections.map((sec, i) => (
          <section key={i} className="mb-8">
            <h2 className="text-2xl font-semibold text-emerald-300 mb-3">{sec.heading}</h2>
            {sec.paragraphs.map((para, j) => (
              <p key={j} className="text-neutral-200 leading-relaxed mb-4">{para}</p>
            ))}
          </section>
        ))}

        <div className="mt-12 p-6 bg-emerald-950/40 border border-emerald-800/50 rounded-xl">
          <h2 className="text-xl font-bold text-emerald-300 mb-2">Watch the full lesson — free</h2>
          <p className="text-neutral-300 mb-4">
            This topic is part of <strong>{course.title}</strong>, a complete AI-narrated video course.
            Press play once and watch the entire lecture like a movie.
          </p>
          <Link
            href={`/courses/${course.id}`}
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Start the course free →
          </Link>
        </div>

        {related.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-neutral-200 mb-4">Continue in this course</h2>
            <ul className="grid gap-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/learn/${r.slug}`} className="text-emerald-400 hover:underline">
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: lesson.title,
              description: intro || undefined,
              author: { '@type': 'Organization', name: 'BioDockify Learn' },
              publisher: { '@type': 'Organization', name: 'BioDockify Learn' },
              isPartOf: { '@type': 'Course', name: course.title, url: `${BASE}/courses/${course.id}` },
              mainEntityOfPage: `${BASE}/learn/${slug}`,
            }),
          }}
        />
      </article>
    </main>
  );
}
