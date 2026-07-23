'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, BookOpen, Target, Calendar, Plus } from 'lucide-react';

export default function CohortsPage() {
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const userId = typeof window !== 'undefined' ? localStorage.getItem('biodockify_user_id') ?? 'admin' : 'admin';

  useEffect(() => {
    fetch('/api/learning/cohorts')
      .then((r) => r.json())
      .then((d) => setCohorts(d.cohorts ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const createCohort = async () => {
    if (!name.trim()) return;
    const res = await fetch('/api/learning/cohorts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc, created_by: userId }),
    });
    if (res.ok) {
      setShowCreate(false);
      setName('');
      setDesc('');
      const data = await res.json();
      setCohorts([data.cohort, ...cohorts]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Training Programs</h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                Manage cohorts, track goals, and monitor recertification
              </p>
            </div>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> New Cohort
            </button>
          </div>

          {showCreate && (
            <div className="mt-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 space-y-3">
              <input
                type="text"
                placeholder="Cohort name (e.g., 2026 GMP Recertification)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
              />
              <button
                onClick={createCohort}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
              >
                Create
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {cohorts.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-12 border border-neutral-200 dark:border-neutral-800 text-center">
            <Users className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No cohorts yet</h3>
            <p className="text-neutral-500">Create a training program to group courses and track learner goals</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cohorts.map((cohort) => (
              <Link key={cohort.id} href={`/cohorts/${cohort.id}`}>
                <div className="group bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-lg transition-all hover:-translate-y-1">
                  <div className="h-2 -mx-6 -mt-6 mb-4 rounded-t-xl bg-gradient-to-r from-emerald-500 to-teal-600" />
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-1 group-hover:text-emerald-600 transition-colors">
                    {cohort.name}
                  </h3>
                  <p className="text-sm text-neutral-500 line-clamp-2 mb-4">{cohort.description}</p>
                  <div className="flex items-center gap-4 text-xs text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(cohort.created_at).toLocaleDateString()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                      {cohort.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
