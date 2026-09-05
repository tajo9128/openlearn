import { createLogger } from '@/lib/logger';

const log = createLogger('LessonCompletion');

/**
 * Player-driven completion: when a classroom lecture's LAST scene finishes
 * (auto-play chain reaches the end), mark the linked lesson completed for
 * this user. The watch-time gate lives on the lesson page and never sees
 * classroom-route viewers, so the player itself must record completion.
 */
export async function markLessonCompletedFromPlayer(classroomId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const userId = localStorage.getItem('biodockify_user_id');
    if (!userId) return; // not signed in / no anonymous id yet

    const res = await fetch(`/api/learning/lessons/by-classroom?classroom_id=${encodeURIComponent(classroomId)}`);
    if (!res.ok) return;
    const data = await res.json();
    const lesson = data?.lesson ?? data?.data?.lesson;
    if (!lesson?.id || !lesson?.course_id) return;

    await fetch('/api/learning/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        lesson_id: lesson.id,
        course_id: lesson.course_id,
        status: 'completed',
      }),
    });
    log.info(`Lesson completed via player: ${lesson.id}`);
  } catch (e) {
    log.warn('Player completion recording failed:', e);
  }
}
