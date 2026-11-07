'use client'
import { getUserId } from '@/lib/learning/get-user-id';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Award, TrendingUp, ChevronRight, GraduationCap, Flame, PlayCircle } from 'lucide-react';
import { getStreak } from '@/lib/learning/streaks';

export default function DashboardPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [progressRows, setProgressRows] = useState<any[]>([]);
  const [lessonTotals, setLessonTotals] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({ coursesEnrolled: 0, lessonsCompleted: 0, certificatesEarned: 0 });
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0 });
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  useEffect(() => {
    Promise.all([
      fetch(`/api/learning/enroll?user_id=${userId}`).then((r) => r.json()),
      fetch(`/api/learning/progress?user_id=${userId}`).then((r) => r.json()),
      fetch(`/api/learning/certificates?user_id=${userId}`).then((r) => r.json()),
    ])
      .then(async ([enrollData, progressData, certData]) => {
        const enrs = enrollData.enrollments ?? [];
        setEnrollments(enrs);
        setCertificates(certData.certificates ?? []);
        setProgressRows(progressData.progress ?? []);
        setStats({
          coursesEnrolled: enrs.length,
          lessonsCompleted: progressData.completed ?? 0,
          certificatesEarned: certData.certificates?.length ?? 0,
        });

        // Fetch lesson counts per enrolled course (for progress bars)
        const totals: Record<string, number> = {};
        await Promise.all(
          enrs.map((e: any) =>
            e.course_id
              ? fetch(`/api/learning/courses/${e.course_id}`)
                  .then((r) => r.json())
                  .then((d) => {
                    const lessons = (d.modules ?? []).flatMap((m: any) => m.lessons ?? []);
                    totals[e.course_id] = lessons.length;
                  })
                  .catch(() => {})
              : Promise.resolve(),
          ),
        );
        setLessonTotals(totals);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    setStreak(getStreak());
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Compute per-course progress + find "Continue Learning" target
  const courseProgress: Record<string, { done: number; total: number; pct: number }> = {};
  for (const e of enrollments) {
    const cid = e.course_id;
    const rows = progressRows.filter((p: any) => p.course_id === cid);
    const done = rows.filter((p: any) => p.status === 'completed').length;
    const total = lessonTotals[cid] ?? 0;
    courseProgress[cid] = { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

  // Continue Learning: most recently started in_progress course with lessons left
  const continueCourse = enrollments
    .map((e: any) => ({ e, p: courseProgress[e.course_id] }))
    .filter(({ p }) => p && p.total > 0 && p.done < p.total)
    .sort((a, b) => new Date(b.e.enrolled_at).getTime() - new Date(a.e.enrolled_at).getTime())[0];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">My Dashboard</h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                Track your learning progress
              </p>
            </div>
            <Link
              href="/courses"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              Browse Courses
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Continue Learning hero */}
        {continueCourse && (
          <Link
            href={`/courses/${continueCourse.e.course_id}`}
            className="block mb-8 rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 hover:shadow-lg transition-shadow"
          >
            <div className="p-6 flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <PlayCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">
                  Continue Learning
                </p>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white truncate">
                  {continueCourse.e.learning_courses?.title ?? 'Course'}
                </h2>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden max-w-xs">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${continueCourse.p.pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-neutral-500 whitespace-nowrap">
                    {continueCourse.p.done}/{continueCourse.p.total} lessons
                  </span>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            </div>
          </Link>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {streak.currentStreak}
                </p>
                <p className="text-xs text-neutral-500">Day Streak 🔥</p>
              </div>
            </div>
          </div>
          {[
            { icon: BookOpen, label: 'Courses Enrolled', value: stats.coursesEnrolled, color: 'emerald' },
            { icon: TrendingUp, label: 'Lessons Completed', value: stats.lessonsCompleted, color: 'blue' },
            { icon: Award, label: 'Certificates Earned', value: stats.certificatesEarned, color: 'amber' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
                  <p className="text-xs text-neutral-500">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* My Courses */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">My Courses</h2>
            <Link
              href="/courses"
              className="text-sm text-emerald-600 hover:underline flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {enrollments.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 rounded-xl p-12 border border-neutral-200 dark:border-neutral-800 text-center">
              <GraduationCap className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                No courses yet
              </h3>
              <p className="text-neutral-500 mb-4">
                Start your learning journey by enrolling in a course
              </p>
              <Link
                href="/courses"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                Browse Courses
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.map((enrollment: any) => {
                const course = enrollment.learning_courses;
                if (!course) return null;
                const p = courseProgress[course.id] ?? { done: 0, total: 0, pct: 0 };
                return (
                  <Link key={enrollment.id} href={`/courses/${course.id}`}>
                    <div className="group rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                      <div className="h-32 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <BookOpen className="w-10 h-10 text-white opacity-80" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-1 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-xs text-neutral-500 mb-3">
                          Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}
                        </p>
                        {p.total > 0 && (
                          <div>
                            <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${p.pct}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-1.5">
                              {p.done}/{p.total} lessons{p.pct === 100 ? ' ✓ Complete!' : ''}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Certificates */}
        {certificates.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              My Certificates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert: any) => (
                <Link key={cert.id} href={`/certificates/${cert.id}`}>
                  <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800 hover:shadow-md transition-shadow flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Award className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-neutral-900 dark:text-white">
                        {cert.learning_courses?.title ?? 'Course Certificate'}
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Issued {new Date(cert.issued_at).toLocaleDateString()} &bull;{' '}
                        {cert.certificate_number}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
