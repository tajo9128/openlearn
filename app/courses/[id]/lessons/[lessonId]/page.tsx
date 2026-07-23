'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle, BookOpen, Clock, MessageSquare } from 'lucide-react';

export default function LessonPage() {
  const { id, lessonId } = useParams();
  const router = useRouter();
  const [lesson, setLesson] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [codingExercises, setCodingExercises] = useState<any[]>([]);
  const startTime = useRef(Date.now());
  const userId =
    typeof window !== 'undefined'
      ? localStorage.getItem('biodockify_user_id') ?? 'demo-user'
      : 'demo-user';

  useEffect(() => {
    if (!id) return;
    fetch(`/api/learning/courses/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setCourse(d.course);
        setModules(d.modules ?? []);
        const allLessons = d.modules?.flatMap((m: any) => m.lessons ?? []) ?? [];
        const found = allLessons.find((l: any) => l.id === lessonId);
        setLesson(found);
        // Fetch coding exercises
        fetch(`/api/learning/exercises?lesson_id=${lessonId}`)
          .then((r) => r.json())
          .then((d) => setCodingExercises((d.exercises ?? []).filter((e: any) => e.exercise_type === 'coding')))
          .catch(() => {});
        // Mark as in_progress
        if (found) {
          fetch('/api/learning/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              lesson_id: lessonId,
              course_id: id,
              status: 'in_progress',
            }),
          }).catch(console.error);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, lessonId, userId]);

  const allLessons = modules.flatMap((m: any) => m.lessons ?? []);
  const currentIndex = allLessons.findIndex((l: any) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const markComplete = async () => {
    const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
    await fetch('/api/learning/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        lesson_id: lessonId,
        course_id: id,
        status: 'completed',
        time_spent_seconds: timeSpent,
      }),
    });
    if (nextLesson) {
      router.push(`/courses/${id}/lessons/${nextLesson.id}`);
    }
  };

  const askAI = async () => {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiAnswer('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a helpful AI tutor for a pharmaceutical research course. The student is studying: "${lesson?.title}". Course: "${course?.title}". Answer clearly and concisely.`,
            },
            { role: 'user', content: aiQuestion },
          ],
        }),
      });
      const data = await res.json();
      setAiAnswer(data.content ?? data.message ?? 'Could not process that question.');
    } catch {
      setAiAnswer('Sorry, the AI tutor is unavailable. Please try again.');
    }
    setAiLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <p className="text-neutral-500">Lesson not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Top nav */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={`/courses/${id}`}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <ArrowLeft className="w-4 h-4" /> Back to {course?.title ?? 'Course'}
          </Link>
          <span className="text-sm text-neutral-400">
            Lesson {currentIndex + 1} of {allLessons.length}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Lesson header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            {lesson.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" /> {lesson.content_type}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> {lesson.duration_minutes} min
            </span>
          </div>
        </div>

        {/* Lesson content */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 mb-8">
          <div className="prose dark:prose-invert max-w-none">
            {lesson.content ? (
              <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
            ) : (
              <div className="text-center py-12 text-neutral-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Lesson content will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Practice Lab */}
        {codingExercises.length > 0 && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 mb-8">
            <h3 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white mb-4">
              <FlaskConical className="w-5 h-5 text-emerald-500" /> Practice Lab
            </h3>
            <p className="text-sm text-neutral-500 mb-4">Test your knowledge with hands-on coding exercises.</p>
            <div className="space-y-3">
              {codingExercises.map((ex: any) => (
                <Link
                  key={ex.id}
                  href={`/courses/${id}/lessons/${lessonId}/practice`}
                  className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FlaskConical className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">{ex.title}</p>
                      <p className="text-xs text-neutral-500">{ex.difficulty} \u2022 {ex.points} points</p>
                    </div>
                  </div>
                  <span className="text-sm text-emerald-600 hover:underline">Start</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* AI Tutor */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 mb-8">
          <h3 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white mb-4">
            <MessageSquare className="w-5 h-5 text-emerald-500" /> Ask the AI Tutor
          </h3>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askAI()}
              placeholder="Ask a question about this lesson..."
              className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={askAI}
              disabled={aiLoading}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {aiLoading ? 'Thinking...' : 'Ask'}
            </button>
          </div>
          {aiAnswer && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 text-sm text-neutral-700 dark:text-neutral-300">
              {aiAnswer}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {prevLesson ? (
            <Link
              href={`/courses/${id}/lessons/${prevLesson.id}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> {prevLesson.title}
            </Link>
          ) : (
            <div />
          )}
          <button
            onClick={markComplete}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            <CheckCircle className="w-4 h-4" /> Mark Complete {nextLesson && '& Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
