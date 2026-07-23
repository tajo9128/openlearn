'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Award, TrendingUp, ChevronRight, GraduationCap } from 'lucide-react';

export default function DashboardPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [stats, setStats] = useState({ coursesEnrolled: 0, lessonsCompleted: 0, certificatesEarned: 0 });
  const [loading, setLoading] = useState(true);
  const userId =
    typeof window !== 'undefined'
      ? localStorage.getItem('biodockify_user_id') ?? 'demo-user'
      : 'demo-user';

  useEffect(() => {
    Promise.all([
      fetch(`/api/learning/enroll?user_id=${userId}`).then((r) => r.json()),
      fetch(`/api/learning/progress?user_id=${userId}`).then((r) => r.json()),
      fetch(`/api/learning/certificates?user_id=${userId}`).then((r) => r.json()),
    ])
      .then(([enrollData, progressData, certData]) => {
        const enrs = enrollData.enrollments ?? [];
        setEnrollments(enrs);
        setCertificates(certData.certificates ?? []);
        setStats({
          coursesEnrolled: enrs.length,
          lessonsCompleted: progressData.completed ?? 0,
          certificatesEarned: certData.certificates?.length ?? 0,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { icon: BookOpen, label: 'Courses Enrolled', value: stats.coursesEnrolled, color: 'emerald' },
            { icon: TrendingUp, label: 'Lessons Completed', value: stats.lessonsCompleted, color: 'blue' },
            { icon: Award, label: 'Certificates Earned', value: stats.certificatesEarned, color: 'amber' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center`}
                >
                  <Icon className={`w-6 h-6 text-${color}-600`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
                  <p className="text-sm text-neutral-500">{label}</p>
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
                        <p className="text-xs text-neutral-500">
                          Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}
                        </p>
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
