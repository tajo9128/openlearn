'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, BookOpen, Clock, Lock } from 'lucide-react';

const CATEGORIES = ['all', 'pharmacy', 'medicinal-chemistry', 'python', 'ai', 'research'];
const DIFFICULTIES = ['all', 'beginner', 'intermediate', 'advanced'];

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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Course Catalog
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">
            Explore AI-powered pharmaceutical research courses
          </p>

          <div className="relative max-w-xl mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-400" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d === 'all' ? 'All Levels' : d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sorted.map((course: any) => {
              const moduleCount = course.learning_modules?.[0]?.count ?? 0;
              const isComingSoon = !course.is_published;

              return (
                <div key={course.id} className="relative">
                  {isComingSoon ? (
                    <div className="group rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden opacity-75">
                      <div className="h-40 bg-gradient-to-br from-neutral-400 to-neutral-500 dark:from-neutral-600 dark:to-neutral-700 flex items-center justify-center">
                        <Lock className="w-12 h-12 text-white opacity-60" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                            Coming Soon
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                            {course.category ?? 'pharmacy'}
                          </span>
                        </div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-1 line-clamp-2">
                          {course.title}
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-3">
                          {course.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-neutral-400">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" /> {moduleCount} modules
                            </span>
                            {course.duration_hours && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {course.duration_hours}h
                              </span>
                            )}
                          </div>
                          {course.is_free && (
                            <span className="text-neutral-400 font-medium">Free</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Link href={`/courses/${course.id}`}>
                      <div className="group rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="h-40 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-white opacity-80" />
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                              {course.category ?? 'pharmacy'}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              {course.difficulty ?? 'beginner'}
                            </span>
                          </div>
                          <h3 className="font-semibold text-neutral-900 dark:text-white mb-1 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                            {course.title}
                          </h3>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-3">
                            {course.description}
                          </p>
                          <div className="flex items-center justify-between text-xs text-neutral-400">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" /> {moduleCount} modules
                              </span>
                              {course.duration_hours && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {course.duration_hours}h
                                </span>
                              )}
                            </div>
                            {course.is_free && (
                              <span className="text-emerald-600 font-medium">Free</span>
                            )}
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
