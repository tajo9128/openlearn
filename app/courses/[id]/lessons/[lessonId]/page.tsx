'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, CheckCircle, BookOpen, Clock, MessageSquare,
  Play, Sparkles, Loader2, Download, Eye, FlaskConical, AlertCircle,
} from 'lucide-react';
import { getCompletionStatus, attemptAutoComplete, WatchTimer } from '@/lib/learning/auto-complete';

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

  // Classroom generation state
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState('');
  const [classroomId, setClassroomId] = useState<string | null>(null);

  // Watch time state
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [completionStatus, setCompletionStatus] = useState<any>(null);
  const timerRef = useRef<WatchTimer | null>(null);

  const userId = typeof window !== 'undefined'
    ? localStorage.getItem('biodockify_user_id') ?? 'demo-user'
    : 'demo-user';

  // Fetch lesson + course data
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
        if (found?.classroom_id) setClassroomId(found.classroom_id);

        // Mark as in_progress
        if (found) {
          fetch('/api/learning/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId, lesson_id: lessonId, course_id: id, status: 'in_progress',
            }),
          }).catch(() => {});
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, lessonId, userId]);

  // Track watch time + completion status
  useEffect(() => {
    if (!lesson) return;

    const timer = new WatchTimer(lessonId as string, (total) => {
      setWatchSeconds(total);
      // Re-check completion
      const status = getCompletionStatus(
        lessonId as string,
        lesson.duration_minutes ?? 15,
        false, // hasExercises checked separately
      );
      setCompletionStatus(status);
    });
    timerRef.current = timer;
    timer.start();

    // Initial status
    const status = getCompletionStatus(
      lessonId as string,
      lesson.duration_minutes ?? 15,
      false,
    );
    setCompletionStatus(status);

    return () => timer.stop();
  }, [lesson, lessonId]);

  const allLessons = modules.flatMap((m: any) => m.lessons ?? []);
  const currentIndex = allLessons.findIndex((l: any) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Generate classroom from lesson content
  const handleGenerateClassroom = async () => {
    if (!lesson || generating) return;
    setGenerating(true);
    setGenProgress('Preparing lesson content...');

    try {
      const res = await fetch('/api/learning/classroom/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: lessonId, course_id: id }),
      });
      const data = await res.json();

      if (data.success && data.classroom_id) {
        setClassroomId(data.classroom_id);
        // Update lesson in local state
        setLesson((prev: any) => ({ ...prev, classroom_id: data.classroom_id }));
        setGenProgress('');
        // Open classroom in new tab
        window.open(`/classroom/${data.classroom_id}`, '_blank');
      } else {
        setGenProgress('Failed: ' + (data.error ?? 'Unknown error'));
      }
    } catch (e) {
      setGenProgress('Error: ' + String(e));
    }
    setGenerating(false);
  };

  // AI Tutor
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
              content: `You are a helpful AI tutor. The student is studying: "${lesson?.title}". Course: "${course?.title}". Answer clearly and concisely.`,
            },
            { role: 'user', content: aiQuestion },
          ],
        }),
      });
      const data = await res.json();
      setAiAnswer(data.content ?? data.message ?? 'Could not process that question.');
    } catch {
      setAiAnswer('Sorry, the AI tutor is unavailable.');
    }
    setAiLoading(false);
  };

  // Auto-complete the lesson
  const handleAutoComplete = async () => {
    const completed = await attemptAutoComplete(
      lessonId as string,
      id as string,
      userId,
      lesson?.duration_minutes ?? 15,
      false,
    );
    if (completed) {
      setCompletionStatus((prev: any) => ({ ...prev, canComplete: true }));
    }
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

  const watchPercent = completionStatus?.watchPercent ?? 0;
  const watchComplete = completionStatus?.watchComplete ?? false;
  const expectedMinutes = lesson.duration_minutes ?? 15;

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
          <div className="flex items-center gap-3">
            {/* Watch progress */}
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Eye className="w-3.5 h-3.5" />
              <span>{Math.floor(watchSeconds / 60)}/{expectedMinutes} min</span>
              <div className="w-20 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, watchPercent)}%` }}
                />
              </div>
            </div>
            <span className="text-sm text-neutral-400">
              Lesson {currentIndex + 1} of {allLessons.length}
            </span>
          </div>
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
              <Clock className="w-4 h-4" /> {expectedMinutes} min
            </span>
          </div>
        </div>

        {/* Classroom Section — The key Coursera-like feature */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 mb-8">
          <h3 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white mb-4">
            <Sparkles className="w-5 h-5 text-emerald-500" /> Interactive Classroom
          </h3>

          {classroomId ? (
            /* Classroom exists — show watch/launch buttons */
            <div className="space-y-4">
              <p className="text-sm text-neutral-500">
                Your interactive classroom is ready. Open it to view slides, quizzes, and AI-powered content.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`/classroom/${classroomId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                >
                  <Play className="w-4 h-4" /> Watch Classroom
                </a>
                <a
                  href={`/classroom/${classroomId}`}
                  target="_blank"
                  className="flex items-center gap-2 px-4 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" /> Full Screen
                </a>
              </div>

              {/* Watch progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                  <span>Watch Progress</span>
                  <span>{watchPercent}%</span>
                </div>
                <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, watchPercent)}%` }}
                  />
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex gap-4 text-xs">
                <span className={`flex items-center gap-1 ${watchComplete ? 'text-emerald-600' : 'text-neutral-400'}`}>
                  {watchComplete ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  {watchComplete ? 'Viewing complete' : `${Math.ceil((expectedMinutes * 60 * 0.8 - watchSeconds) / 60)} min remaining`}
                </span>
              </div>
            </div>
          ) : generating ? (
            /* Generating in progress */
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-4" />
              <p className="text-neutral-700 dark:text-neutral-300 font-medium mb-1">
                Generating your interactive classroom...
              </p>
              <p className="text-sm text-neutral-500">{genProgress || 'This may take 1-2 minutes'}</p>
              <div className="mt-4 w-64 mx-auto h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          ) : (
            /* No classroom yet — show generate button */
            <div className="text-center py-6">
              <Sparkles className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Generate an interactive classroom with slides, quizzes, and AI-powered explanations for this lesson.
              </p>
              <button
                onClick={handleGenerateClassroom}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium mx-auto"
              >
                <Sparkles className="w-4 h-4" /> Generate Interactive Classroom
              </button>
            </div>
          )}
        </div>

        {/* Practice Lab — appears after watch threshold */}
        {watchComplete && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 mb-8 border-l-4 border-emerald-500">
            <h3 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white mb-2">
              <FlaskConical className="w-5 h-5 text-emerald-500" /> Practice Lab Unlocked
            </h3>
            <p className="text-sm text-neutral-500 mb-4">
              Great job watching the lesson! Now test your knowledge with hands-on practice exercises.
            </p>
            <Link
              href={`/courses/${id}/lessons/${lessonId}/practice`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <FlaskConical className="w-4 h-4" /> Start Practice
            </Link>
          </div>
        )}

        {/* Completion status banner */}
        {watchComplete && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4 mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-800 dark:text-emerald-300">Lesson viewing complete!</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  The Brain will auto-mark this as complete once you finish the practice exercises.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Lesson content (fallback if no classroom) */}
        {!classroomId && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-8 mb-8">
            <div className="prose dark:prose-invert max-w-none">
              {lesson.content ? (
                <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
              ) : (
                <div className="text-center py-12 text-neutral-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Generate the interactive classroom to view the lesson content.</p>
                </div>
              )}
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
          {nextLesson && (
            <Link
              href={`/courses/${id}/lessons/${nextLesson.id}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              {nextLesson.title} <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
