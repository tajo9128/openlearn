'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Github, Star, GitFork, ExternalLink, Search, Filter, Code, BookOpen } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Code },
  { id: 'python-courses', label: 'Python Courses', icon: BookOpen },
  { id: 'practice', label: 'Practice', icon: Code },
  { id: 'data-science', label: 'Data Science', icon: Code },
  { id: 'machine-learning', label: 'ML', icon: Code },
  { id: 'ai-llm', label: 'AI & LLM', icon: Code },
  { id: 'bioinformatics', label: 'Bioinformatics', icon: Code },
  { id: 'web-dev', label: 'Web Dev', icon: Code },
  { id: 'automation', label: 'Automation', icon: Code },
  { id: 'gui-dev', label: 'GUI', icon: Code },
  { id: 'resources', label: 'Resources', icon: BookOpen },
];

function formatStars(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

export default function GitHubLearningPage() {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);

    fetch(`/api/learning/github?${params}`)
      .then((r) => r.json())
      .then((d) => setRepos(d.repos ?? []))
      .catch(() => setRepos([]))
      .finally(() => setLoading(false));
  }, [category]);

  const filtered = repos.filter(
    (r) =>
      !search ||
      r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-4">
            <Github className="w-8 h-8" />
            <h1 className="text-3xl font-bold">GitHub Learning</h1>
          </div>
          <p className="text-neutral-300 mb-6 max-w-2xl">
            Curated GitHub repositories for learning Python, data science, machine learning,
            bioinformatics, and more. Study the best open-source projects.
          </p>

          {/* Search */}
          <div className="relative max-w-xl mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  category === cat.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-neutral-500">Loading repositories...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Github className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
            <p className="text-neutral-500">No repositories found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((repo) => (
              <Link key={repo.id} href={`/github/${repo.owner}/${repo.repo}`}>
                <div className="group bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 hover:shadow-lg hover:border-emerald-300 transition-all hover:-translate-y-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Github className="w-4 h-4 text-neutral-400" />
                      <span className="text-xs text-neutral-500 font-mono">{repo.full_name}</span>
                    </div>
                    {repo.is_featured && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                        Featured
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                    {repo.description ?? repo.repo}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-neutral-500 mt-4">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5" /> {formatStars(repo.stars ?? 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3.5 h-3.5" /> {formatStars(repo.forks ?? 0)}
                    </span>
                  </div>

                  {repo.topics && repo.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {repo.topics.slice(0, 4).map((topic: string) => (
                        <span
                          key={topic}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
