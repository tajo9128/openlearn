import type { Metadata } from 'next';
import Link from 'next/link';

const BASE = 'https://learn.biodockify.com';

type CourseRow = { id: string; title: string; description: string | null; category: string | null };

const TRACKS: Record<string, string> = {
  programming: 'Programming',
  'data-science': 'Data Science',
  ai: 'Artificial Intelligence',
  llms: 'LLMs & Generative AI',
  pharmacy: 'Pharmacy & Pharmacology',
  bioinformatics: 'Bioinformatics & Genomics',
};

export const metadata: Metadata = {
  title: 'Course Catalog — All Free AI-Narrated Courses | BioDockify Learn',
  description:
    'Browse every free course on BioDockify Learn: Python, data science, AI/ML, LLM engineering, pharmacology, drug discovery, bioinformatics and healthcare AI. AI-narrated video lessons with certificates.',
  alternates: { canonical: `${BASE}/catalog` },
};

async function allCourses(): Promise<CourseRow[]> {
  try {
    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/learning_courses?is_published=eq.true&select=id,title,description,category&order=created_at`,
      {
        headers: { apikey: process.env.SUPABASE_ANON_KEY || '', Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || ''}` },
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return [];
    return (await res.json()) as CourseRow[];
  } catch {
    return [];
  }
}

export default async function CatalogPage() {
  const courses = await allCourses();
  const byTrack = new Map<string, CourseRow[]>();
  for (const c of courses) {
    const key = c.category || 'other';
    byTrack.set(key, [...(byTrack.get(key) || []), c]);
  }
  const orderedKeys = [...byTrack.keys()].sort((a, b) => (byTrack.get(b)!.length - byTrack.get(a)!.length));

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-3">Course Catalog</h1>
        <p className="text-neutral-400 mb-10">
          {courses.length} free AI-narrated courses — press play once, watch each lesson like a movie.
        </p>
        {orderedKeys.map((key) => (
          <section key={key} className="mb-10">
            <h2 className="text-2xl font-semibold text-emerald-300 mb-4">
              {TRACKS[key] || key.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())}
            </h2>
            <ul className="grid gap-3">
              {(byTrack.get(key) || []).map((c) => (
                <li key={c.id}>
                  <Link href={`/courses/${c.id}`} className="block p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-emerald-700 transition-colors">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-sm text-neutral-400 mt-1">{(c.description || '').slice(0, 140)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
