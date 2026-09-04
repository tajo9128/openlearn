import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const BASE = 'https://learn.biodockify.com';

type CourseRow = { id: string; title: string; description: string | null; category: string | null };

export const dynamic = 'force-dynamic';

const TRACKS: Record<string, { name: string; headline: string; intro: string; categories: string[] }> = {
  'pharma-ai-career': {
    name: 'Pharma AI Career Track',
    headline: 'Break Into Pharma AI: Drug Discovery & Computational Chemistry',
    intro:
      'The complete learning path for a career applying AI to pharmaceutical research — from pharmacology fundamentals through molecular docking, protein structures, and modern AI-driven drug discovery. Free, AI-narrated, certificate-bearing.',
    categories: ['pharmacy', 'chemistry', 'drug-discovery'],
  },
  'bioinformatician': {
    name: 'Bioinformatician Track',
    headline: 'Become a Bioinformatician: Genomics, Sequencing & Single-Cell',
    intro:
      'Everything you need to work with genomic data: command-line skills, sequence analysis, genome assembly, variant calling, RNA-seq and single-cell analysis with Seurat. Built from university curricula.',
    categories: ['bioinformatics', 'biology'],
  },
  'ai-engineer': {
    name: 'AI Engineer Track',
    headline: 'AI Engineer Track: From First Neural Network to Production',
    intro:
      'The modern AI engineering path: ML foundations, deep learning with PyTorch, generative models, LLM engineering, agents, and shipping applications to production. From zero to deployed AI systems.',
    categories: ['ai', 'programming', 'data-science', 'llms'],
  },
  'python-data': {
    name: 'Python & Data Science Track',
    headline: 'Learn Python for Science: From Basics to Data Science',
    intro:
      'Python from absolute zero through professional data science — programming fundamentals, data structures, OOP, NumPy, Pandas, visualization, machine learning, and pharmaceutical data applications.',
    categories: ['programming', 'data-science'],
  },
  'healthcare-ai': {
    name: 'Healthcare AI Track',
    headline: 'Healthcare AI: Safe, Explainable & Clinical-Grade',
    intro:
      'For clinicians and health professionals entering AI: diagnostics, imaging, EHR models, wearables, explainable AI (SHAP, GradCAM), governance and when to override an AI system.',
    categories: ['healthcare', 'ai'],
  },
  'research-scientist': {
    name: 'Research Scientist Track',
    headline: 'Research Scientist Track: Methods, Writing & Computation',
    intro:
      'Master the craft of science itself: research design, literature review, statistics, scientific writing, publishing — plus the computational biology that powers modern research.',
    categories: ['research', 'bioinformatics', 'writing'],
  },
};

const HEADERS = () => ({
  apikey: process.env.SUPABASE_ANON_KEY || '',
  Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY || ''}`,
});

async function coursesForTrack(categories: string[]): Promise<CourseRow[]> {
  try {
    const filter = `is_published=eq.true&category=in.(${categories.join(',')})&select=id,title,description,category`;
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/learning_courses?${filter}&limit=12`, {
      headers: HEADERS(),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return (await res.json()) as CourseRow[];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ track: string }> }): Promise<Metadata> {
  const { track } = await params;
  const t = TRACKS[track];
  if (!t) return { title: 'Track | BioDockify Learn' };
  const title = `${t.headline} | Free Courses — BioDockify Learn`;
  return {
    title,
    description: t.intro.slice(0, 155),
    alternates: { canonical: `${BASE}/track/${track}` },
    openGraph: { title, description: t.intro.slice(0, 155), url: `${BASE}/track/${track}` },
  };
}

export function generateStaticParams() {
  return Object.keys(TRACKS).map((track) => ({ track }));
}

export default async function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  const t = TRACKS[track];
  if (!t) notFound();
  const courses = await coursesForTrack(t.categories);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <nav className="text-sm text-neutral-400 mb-6">
          <Link href="/" className="hover:text-emerald-400">Home</Link>
          <span className="mx-2">›</span>
          <Link href="/catalog" className="hover:text-emerald-400">Catalog</Link>
          <span className="mx-2">›</span>
          <span className="text-neutral-300">{t.name}</span>
        </nav>
        <h1 className="text-4xl font-bold mb-4">{t.headline}</h1>
        <p className="text-lg text-neutral-300 mb-10">{t.intro}</p>

        {courses.length > 0 ? (
          <div className="grid gap-4">
            {courses.map((c, i) => (
              <Link
                key={c.id}
                href={`/courses/${c.id}`}
                className="block p-5 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-emerald-700 transition-colors"
              >
                <p className="text-sm text-emerald-400 mb-1">Step {i + 1}</p>
                <p className="font-semibold text-lg">{c.title}</p>
                <p className="text-neutral-400 mt-1">{(c.description || '').slice(0, 160)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-neutral-400">Courses for this track are being published — check back soon.</p>
        )}

        <div className="mt-12 p-6 bg-emerald-950/40 border border-emerald-800/50 rounded-xl">
          <h2 className="text-xl font-bold text-emerald-300 mb-2">Start anywhere — it is all free</h2>
          <p className="text-neutral-300 mb-4">Every lesson is an AI-narrated video. Press play once, watch the whole lecture.</p>
          <Link href="/courses" className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-3 rounded-lg">
            Browse all courses →
          </Link>
        </div>
      </div>
    </main>
  );
}
