'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Users, BookOpen, Target, ArrowLeft, Plus, Trash2, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';

export default function CohortDetailPage() {
  const { id } = useParams();
  const [cohort, setCohort] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'members' | 'courses' | 'goals'>('members');
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const userId = typeof window !== 'undefined' ? localStorage.getItem('biodockify_user_id') ?? 'admin' : 'admin';

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [detailRes, goalsRes, coursesRes] = await Promise.all([
        fetch(`/api/learning/cohorts/${id}`).then((r) => r.json()),
        fetch(`/api/learning/cohorts/${id}/goals?summary=true`).then((r) => r.json()),
        fetch(`/api/learning/courses?limit=50`).then((r) => r.json()),
      ]);
      setCohort(detailRes.cohort);
      setMembers(detailRes.members ?? []);
      setCourses(detailRes.courses ?? []);
      setGoals(goalsRes.goals ?? []);
      setAllCourses(coursesRes.courses ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addCourse = async (courseId: string) => {
    await fetch(`/api/learning/cohorts/${id}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId }),
    });
    setShowAddCourse(false);
    loadData();
  };

  const createGoal = async () => {
    const courseIds = courses.map((c) => c.course_id);
    if (courseIds.length === 0) return;
    await fetch(`/api/learning/cohorts/${id}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Complete All Courses',
        type: 'complete_all',
        courseIds,
        deadlineKind: 'absolute',
        deadlineDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        reminderDaysBefore: [14, 7, 1],
        created_by: userId,
      }),
    });
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <p className="text-neutral-500">Cohort not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link href="/cohorts" className="flex items-center gap-2 text-sm text-emerald-100 mb-4 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Back to Cohorts
          </Link>
          <h1 className="text-3xl font-bold mb-2">{cohort.name}</h1>
          <p className="text-emerald-100">{cohort.description}</p>
          <div className="flex items-center gap-6 mt-4 text-sm">
            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {members.length} members</span>
            <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {courses.length} courses</span>
            <span className="flex items-center gap-1"><Target className="w-4 h-4" /> {goals.length} goals</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {(['members', 'courses', 'goals'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {tab === 'members' && (
          <div>
            {members.length === 0 ? (
              <p className="text-neutral-500 text-center py-12">No members yet</p>
            ) : (
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">{m.email ?? m.user_id}</p>
                      <p className="text-xs text-neutral-500">Joined {new Date(m.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      m.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      m.role === 'instructor' ? 'bg-blue-100 text-blue-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>{m.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'courses' && (
          <div>
            <div className="flex justify-between mb-4">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Attached Courses</h3>
              <button onClick={() => setShowAddCourse(!showAddCourse)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
                <Plus className="w-4 h-4" /> Add Course
              </button>
            </div>
            {showAddCourse && (
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 mb-4 space-y-2 max-h-60 overflow-y-auto">
                {allCourses.filter((c) => !courses.some((cc) => cc.course_id === c.id)).map((c) => (
                  <button key={c.id} onClick={() => addCourse(c.id)} className="w-full text-left p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg">
                    <span className="text-sm text-neutral-900 dark:text-white">{c.title}</span>
                  </button>
                ))}
              </div>
            )}
            {courses.length === 0 ? (
              <p className="text-neutral-500 text-center py-12">No courses attached</p>
            ) : (
              <div className="space-y-3">
                {courses.map((cc) => (
                  <Link key={cc.id} href={`/courses/${cc.course_id}`}>
                    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:shadow-md transition-shadow flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-emerald-500" />
                      <span className="font-medium text-neutral-900 dark:text-white">{cc.learning_courses?.title ?? 'Course'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'goals' && (
          <div>
            <div className="flex justify-between mb-4">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Training Goals</h3>
              <button onClick={createGoal} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
                <Plus className="w-4 h-4" /> Create Goal
              </button>
            </div>
            {goals.length === 0 ? (
              <p className="text-neutral-500 text-center py-12">No goals yet. Create a "Complete All" goal.</p>
            ) : (
              <div className="space-y-4">
                {goals.map((g) => {
                  const sc = g.statusCounts ?? {};
                  const total = g.totalLearners ?? 0;
                  const completed = sc.completed ?? 0;
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return (
                    <div key={g.id} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-neutral-900 dark:text-white">{g.title}</h4>
                          <p className="text-xs text-neutral-500 mt-1">
                            Type: {g.type} | Deadline: {g.deadline_kind}
                            {g.deadline_date ? ` (${new Date(g.deadline_date).toLocaleDateString()})` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-emerald-600">{pct}%</p>
                          <p className="text-xs text-neutral-500">{completed}/{total} done</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { k: 'completed', l: 'Completed', i: CheckCircle, c: 'emerald' },
                          { k: 'in_progress', l: 'In Progress', i: Clock, c: 'blue' },
                          { k: 'at_risk', l: 'At Risk', i: AlertTriangle, c: 'amber' },
                          { k: 'overdue', l: 'Overdue', i: XCircle, c: 'red' },
                          { k: 'not_started', l: 'Not Started', i: Users, c: 'neutral' },
                        ].map(({ k, l, i: Icon }) => (
                          sc[k] > 0 && (
                            <span key={k} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
                              <Icon className="w-3 h-3" /> {l}: {sc[k]}
                            </span>
                          )
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
