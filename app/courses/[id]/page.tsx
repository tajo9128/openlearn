'use client'
import { getUserId } from '@/lib/learning/get-user-id';
;

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, Play, CheckCircle, Circle, Lock, Clock, Users, Award,
  ChevronDown, ChevronRight,
} from 'lucide-react';

export default function CourseDetailPage() {
  const { id } = useParams();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/learning/courses/${id}`).then((r) => r.json()),
      fetch(`/api/learning/enroll?user_id=${userId}`).then((r) => r.json()),
      fetch(`/api/learning/progress?user_id=${userId}&course_id=${id}`).then((r) => r.json()),
    ])
      .then(([courseData, enrollData, progressData]) => {
        setCourse(courseData.course);
        setModules(courseData.modules ?? []);
        setProgress(progressData.progress ?? []);
        const isEnrolled = enrollData.enrollments?.some((e: any) => e.course_id === id);
        setEnrolled(!!isEnrolled);
        if (courseData.modules?.length > 0) setExpandedModule(courseData.modules[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, userId]);

  const handleEnroll = async () => {
    try {
      const res = await fetch('/api/learning/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, course_id: id }),
      });
      if (res.ok) setEnrolled(true);
    } catch (err) {
      console.error(err);
    }
  };

  const getLessonStatus = (lessonId: string) => {
    const p = progress.find((pr: any) => pr.lesson_id === lessonId);
    return p?.status ?? 'not_started';
  };

  const completedLessons = progress.filter((p: any) => p.status === 'completed').length;
  const totalLessons = modules.reduce(
    (acc: number, m: any) => acc + (m.lessons?.length ?? 0),
    0,
  );
  const progressPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <p className="text-neutral-500">Course not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row items-start gap-8">
            <div className="flex-1">
              <div className="flex gap-2 mb-4">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-sm">
                  {course.category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-sm">
                  {course.difficulty}
                </span>
              </div>
              <h1 className="text-3xl font-bold mb-3">{course.title}</h1>
              <p className="text-emerald-100 mb-6 max-w-2xl">{course.description}</p>
              <div className="flex items-center gap-6 text-sm text-emerald-100">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" /> {modules.length} modules
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {totalLessons} lessons
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" /> BioDockify AI
                </span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 min-w-[200px]">
              {enrolled ? (
                <div className="text-center">
                  {/* Simple progress ring */}
                  <div className="relative w-20 h-20 mx-auto">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                      <circle
                        cx="40" cy="40" r="34" fill="none" stroke="white" strokeWidth="6"
                        strokeDasharray={2 * Math.PI * 34}
                        strokeDashoffset={2 * Math.PI * 34 * (1 - progressPercent / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                      {progressPercent}%
                    </span>
                  </div>
                  <p className="text-sm mt-2">
                    {completedLessons}/{totalLessons} lessons
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleEnroll}
                  className="w-full px-6 py-3 bg-white text-emerald-700 rounded-lg font-semibold hover:bg-emerald-50 transition-colors"
                >
                  {course.is_free === false && course.price != null
                    ? `Enroll — $${course.price}`
                    : 'Enroll for Free'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* B.Pharm Notes banner (PCI syllabus) */}
        <Link
          href="/notes"
          className="mb-6 flex items-center gap-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5 hover:shadow-lg transition-shadow"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M9 15l2 2 4-4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-mono bg-emerald-600 text-white px-2 py-0.5 rounded-full">BP-101T</span>
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">FREE DOWNLOAD</span>
            </div>
            <h3 className="font-bold text-neutral-900 dark:text-white">
              B.Pharm Python Notes — PCI Syllabus (5 Units)
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Handwritten notes by Dr. Tajuddin &middot; Unit 1 available now &middot; PDF + DOCX
            </p>
          </div>
          <span className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold whitespace-nowrap">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Get Notes
          </span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Module sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 sticky top-4">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="font-semibold text-neutral-900 dark:text-white">Course Content</h2>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[600px] overflow-y-auto">
                {modules.map((mod: any, idx: number) => (
                  <div key={mod.id}>
                    <button
                      onClick={() =>
                        setExpandedModule(expandedModule === mod.id ? null : mod.id)
                      }
                      className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <div className="flex items-center gap-3 text-left">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center font-medium">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">
                          {mod.title}
                        </span>
                      </div>
                      {expandedModule === mod.id ? (
                        <ChevronDown className="w-4 h-4 text-neutral-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                      )}
                    </button>
                    {expandedModule === mod.id && mod.lessons?.length > 0 && (
                      <div className="bg-neutral-50 dark:bg-neutral-800/50">
                        {mod.lessons.map((lesson: any) => {
                          const status = getLessonStatus(lesson.id);
                          return (
                            <Link
                              key={lesson.id}
                              href={enrolled ? `/courses/${id}/lessons/${lesson.id}` : '#'}
                              className={`flex items-center gap-3 px-4 py-2.5 pl-12 text-sm transition-colors ${
                                enrolled
                                  ? 'hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer'
                                  : 'opacity-50 cursor-not-allowed'
                              }`}
                            >
                              {status === 'completed' ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : status === 'in_progress' ? (
                                <Play className="w-4 h-4 text-blue-500 shrink-0" />
                              ) : enrolled ? (
                                <Circle className="w-4 h-4 text-neutral-300 shrink-0" />
                              ) : (
                                <Lock className="w-4 h-4 text-neutral-300 shrink-0" />
                              )}
                              <span className="text-neutral-700 dark:text-neutral-300">
                                {lesson.title}
                              </span>
                              <span className="ml-auto text-xs text-neutral-400">
                                {lesson.duration_minutes ? `${lesson.duration_minutes}m` : 'Video'}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
                About This Course
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                <p>{course.description}</p>
                <h3>What You&apos;ll Learn</h3>
                <ul>
                  {modules.map((mod: any) => (
                    <li key={mod.id}>{mod.title}</li>
                  ))}
                </ul>
              </div>
              {enrolled && (
                <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
                    Your Progress
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold text-emerald-600">{progressPercent}%</div>
                    <div>
                      <p className="text-neutral-900 dark:text-white font-medium">
                        {completedLessons} of {totalLessons} lessons completed
                      </p>
                      {completedLessons === totalLessons && totalLessons > 0 && (
                        <button
                          onClick={async () => {
                            const res = await fetch('/api/learning/certificates', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ user_id: userId, course_id: id }),
                            });
                            const data = await res.json();
                            alert(
                              data.success
                                ? 'Certificate issued!'
                                : data.error ?? 'Could not issue certificate',
                            );
                          }}
                          className="inline-flex items-center gap-1 mt-2 text-sm text-emerald-600 hover:underline"
                        >
                          <Award className="w-4 h-4" /> Claim Certificate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
