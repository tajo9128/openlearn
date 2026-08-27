'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, BookOpen, Clock, Lock, Sparkles, Award, Code2, Cpu, Dna, Pill, FlaskConical, BarChart3 } from 'lucide-react';

const CATEGORIES = ['all', 'pharmacy', 'medicinal-chemistry', 'python', 'ai', 'research'];
const DIFFICULTIES = ['all', 'beginner', 'intermediate', 'advanced'];

// Course card design mapping based on launch banner
const COURSE_STYLING: Record<string, { icon: any; gradient: string; badge: string; subtitle: string; lessonsText: string }> = {
  'python-programming---basics': {
    icon: Code2,
    gradient: 'from-emerald-600 to-teal-700',
    badge: 'Python Track',
    subtitle: 'From zero to confident coder',
    lessonsText: '28 lessons',
  },
  'ai-in-drug-discovery': {
    icon: Cpu,
    gradient: 'from-cyan-600 to-blue-700',
    badge: 'AI & DeepChem',
    subtitle: 'The DeepChem skill track',
    lessonsText: '14 lessons',
  },
  'python-for-data-science': {
    icon: BarChart3,
    gradient: 'from-indigo-600 to-blue-700',
    badge: 'Data Science',
    subtitle: 'Your data analytics toolkit',
    lessonsText: '10 lessons',
  },
  'structural-biology-&-drug-discovery': {
    icon: Dna,
    gradient: 'from-purple-600 to-indigo-700',
    badge: 'Structural Biology',
    subtitle: 'From protein to pill',
    lessonsText: '9 lessons',
  },
  'introduction-to-pharmacology': {
    icon: Pill,
    gradient: 'from-rose-600 to-amber-600',
    badge: 'Pharmacology',
    subtitle: 'The pharma foundation',
    lessonsText: '8 lessons',
  },
  'python-for-pharmaceutical-research': {
    icon: FlaskConical,
    gradient: 'from-emerald-600 to-cyan-700',
    badge: 'RDKit & Chemoinformatics',
    subtitle: 'Code for the lab',
    lessonsText: '2 lessons',
  },
};

function getCourseMeta(title: string) {
  const slug = (title || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-&]/g, '');
  return (
    COURSE_STYLING[slug] || {
      icon: BookOpen,
      gradient: 'from-emerald-600 to-teal-700',
      badge: 'Certified Course',
      subtitle: 'Self-paced learning',
      lessonsText: 'Interactive lessons',
    }
  );
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (difficulty !== 'all') params.set('difficulty', difficulty);

    fetch(`/api/learning/courses?${params}`)
      .then((r) => r.json())
      .then((d) => setCourses(d.courses ?? []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, [category, difficulty]);

  const filtered = courses.filter(
    (c) =>
      !search ||
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase()),
  );

  // Sort: published first, then coming soon
  const sorted = [...filtered].sort((a, b) => {
    if (a.is_published && !b.is_published) return -1;
    if (!a.is_published && b.is_published) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-16">
      {/* ═══ Header Hero Showcase Banner ═══ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-neutral-900 to-slate-900 border-b border-neutral-800 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))]" />
        <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" /> 6 COURSES ARE LIVE
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <BookOpen className="w-3.5 h-3.5" /> 71 LESSONS
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Award className="w-3.5 h-3.5" /> 100% FREE TO START
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
            AI-Powered Pharmaceutical Courses
          </h1>
          <p className="text-neutral-300 max-w-2xl text-base md:text-lg mb-6 leading-relaxed">
            Learn pharmaceutical science with interactive AI-narrated video lessons — play like a movie, code in browser, and learn at your pace.
          </p>

          {/* Value props pills */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl pt-2">
            {[
              { title: 'Video-style Lessons', desc: 'Interactive voice narration' },
              { title: 'Practice Exercises', desc: 'In-browser Python coding' },
              { title: 'Course Certificates', desc: 'Issued on completion' },
              { title: 'Learn At Your Pace', desc: '100% Self-paced' },
            ].map((p) => (
              <div key={p.title} className="p-3 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
                <p className="text-sm font-semibold text-white">{p.title}</p>
                <p className="text-xs text-neutral-400">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-sm sticky top-14 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search courses or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-400" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Categories' : c.replace('-', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 focus:outline-none"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d === 'all' ? 'All Levels' : d.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-neutral-500">Loading courses...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
              No courses found
            </h3>
            <p className="text-neutral-500">Check back later or try different filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((course: any) => {
              const meta = getCourseMeta(course.title);
              const Icon = meta.icon;
              const isComingSoon = !course.is_published;

              return (
                <div key={course.id} className="relative flex flex-col">
                  {isComingSoon ? (
                    <div className="flex-1 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden opacity-75 flex flex-col">
                      <div className="h-44 bg-gradient-to-br from-neutral-600 to-neutral-800 p-6 flex flex-col justify-between text-white relative">
                        <div className="flex items-center justify-between">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/30 text-amber-200 font-semibold border border-amber-500/40">
                            Coming Soon
                          </span>
                          <Lock className="w-5 h-5 opacity-70" />
                        </div>
                        <div>
                          <Icon className="w-8 h-8 opacity-80 mb-2" />
                          <p className="text-xs text-neutral-300">{meta.subtitle}</p>
                        </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-2 line-clamp-2">
                            {course.title}
                          </h3>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-3 mb-4">
                            {course.description}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-neutral-400 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                          <span>{meta.lessonsText}</span>
                          <span>Free</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Link href={`/courses/${course.id}`} className="flex-1 flex flex-col">
                      <div className="flex-1 group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1 flex flex-col">
                        <div className={`h-44 bg-gradient-to-br ${meta.gradient} p-6 flex flex-col justify-between text-white relative overflow-hidden`}>
                          <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 pointer-events-none">
                            <Icon className="w-36 h-36" />
                          </div>
                          <div className="flex items-center justify-between relative z-10">
                            <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 text-white font-semibold backdrop-blur-sm">
                              {meta.badge}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-black/20 text-white/90 font-medium">
                              {course.difficulty ?? 'beginner'}
                            </span>
                          </div>
                          <div className="relative z-10">
                            <Icon className="w-8 h-8 text-white mb-1.5" />
                            <p className="text-xs text-white/80 font-medium">{meta.subtitle}</p>
                          </div>
                        </div>

                        <div className="p-6 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-lg text-neutral-900 dark:text-white mb-2 line-clamp-2 group-hover:text-emerald-500 transition-colors">
                              {course.title}
                            </h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-3 mb-4 leading-relaxed">
                              {course.description}
                            </p>
                          </div>

                          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                              <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5" /> {meta.lessonsText}
                              </span>
                              {course.duration_hours && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> {course.duration_hours}h duration
                                </span>
                              )}
                            </div>

                            <button className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5">
                              Start Free Course &rarr;
                            </button>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
