/**
 * Auto-Complete Logic — Coursera-style lesson completion
 *
 * A lesson is auto-completed when:
 * 1. Watch time >= 80% of expected duration
 * 2. Practice score >= 60% (if exercises exist)
 *
 * The Brain (not the student) marks lessons as complete.
 */

const WATCH_THRESHOLD = 0.8; // 80% of expected duration
const PRACTICE_PASS_SCORE = 60; // 60% minimum

// ==================== Watch Time Tracking ====================

const WATCH_TIME_KEY_PREFIX = 'bd_watch_';

/**
 * Get accumulated watch time for a lesson (in seconds).
 */
export function getWatchTime(lessonId: string): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(`${WATCH_TIME_KEY_PREFIX}${lessonId}`);
  return stored ? parseInt(stored, 10) : 0;
}

/**
 * Add watch time for a lesson.
 */
export function addWatchTime(lessonId: string, seconds: number): void {
  if (typeof window === 'undefined') return;
  const current = getWatchTime(lessonId);
  localStorage.setItem(`${WATCH_TIME_KEY_PREFIX}${lessonId}`, String(current + seconds));
}

/**
 * Check if watch threshold is met.
 */
export function isWatchComplete(lessonId: string, expectedMinutes: number): boolean {
  const watched = getWatchTime(lessonId);
  const expectedSeconds = expectedMinutes * 60;
  return watched >= expectedSeconds * WATCH_THRESHOLD;
}

/**
 * Get watch progress as percentage (0-100).
 */
export function getWatchPercent(lessonId: string, expectedMinutes: number): number {
  const watched = getWatchTime(lessonId);
  const expectedSeconds = expectedMinutes * 60;
  if (expectedSeconds === 0) return 100;
  return Math.min(100, Math.round((watched / expectedSeconds) * 100));
}

// ==================== Practice Score Check ====================

/**
 * Get the best practice score for a lesson from localStorage.
 * Stored by the practice page after submission.
 */
export function getPracticeScore(lessonId: string): number | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(`bd_practice_${lessonId}`);
  return stored ? parseFloat(stored) : null;
}

/**
 * Set the practice score for a lesson.
 */
export function setPracticeScore(lessonId: string, score: number): void {
  if (typeof window === 'undefined') return;
  const existing = getPracticeScore(lessonId);
  // Keep the best score
  if (existing === null || score > existing) {
    localStorage.setItem(`bd_practice_${lessonId}`, String(score));
  }
}

/**
 * Check if practice is passed.
 */
export function isPracticeComplete(lessonId: string): boolean {
  const score = getPracticeScore(lessonId);
  if (score === null) return true; // No practice required = pass
  return score >= PRACTICE_PASS_SCORE;
}

// ==================== Auto-Complete Logic ====================

export interface CompletionStatus {
  watchComplete: boolean;
  practiceComplete: boolean;
  canComplete: boolean;
  watchPercent: number;
  practiceScore: number | null;
  watchTime: number;
  expectedMinutes: number;
}

/**
 * Get the full completion status for a lesson.
 */
export function getCompletionStatus(
  lessonId: string,
  expectedMinutes: number,
  hasExercises: boolean,
): CompletionStatus {
  const watchComplete = isWatchComplete(lessonId, expectedMinutes);
  const practiceScore = getPracticeScore(lessonId);
  const practiceComplete = hasExercises
    ? (practiceScore !== null && practiceScore >= PRACTICE_PASS_SCORE)
    : true; // No exercises = auto-pass

  return {
    watchComplete,
    practiceComplete,
    canComplete: watchComplete && practiceComplete,
    watchPercent: getWatchPercent(lessonId, expectedMinutes),
    practiceScore,
    watchTime: getWatchTime(lessonId),
    expectedMinutes,
  };
}

/**
 * Attempt to auto-complete a lesson.
 * Called by the Brain or the lesson page when conditions are met.
 * Returns true if completion was triggered.
 */
export async function attemptAutoComplete(
  lessonId: string,
  courseId: string,
  userId: string,
  expectedMinutes: number,
  hasExercises: boolean,
): Promise<boolean> {
  const status = getCompletionStatus(lessonId, expectedMinutes, hasExercises);

  if (!status.canComplete) return false;

  // Send completion to API
  try {
    const res = await fetch('/api/learning/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        lesson_id: lessonId,
        course_id: courseId,
        status: 'completed',
        time_spent_seconds: status.watchTime,
        score: status.practiceScore,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ==================== Watch Timer Class ====================

/**
 * Manages a watch timer for classroom viewing.
 * Tracks active viewing time (pauses when tab is hidden).
 */
export class WatchTimer {
  private lessonId: string;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private secondsThisSession = 0;
  private isActive = false;
  private onUpdate: ((totalSeconds: number) => void) | null = null;

  constructor(lessonId: string, onUpdate?: (totalSeconds: number) => void) {
    this.lessonId = lessonId;
    this.onUpdate = onUpdate ?? null;
  }

  /** Start tracking watch time */
  start(): void {
    if (this.isActive) return;
    this.isActive = true;

    this.intervalId = setInterval(() => {
      if (this.isActive) {
        this.secondsThisSession++;
        addWatchTime(this.lessonId, 1);
        const total = getWatchTime(this.lessonId);
        this.onUpdate?.(total);
      }
    }, 1000);

    // Pause on visibility change
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibility);
    }
  }

  /** Stop tracking and persist */
  stop(): void {
    this.isActive = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
  }

  /** Get total watch time across sessions */
  getTotal(): number {
    return getWatchTime(this.lessonId);
  }

  /** Get this session's watch time */
  getSessionTime(): number {
    return this.secondsThisSession;
  }

  private handleVisibility = () => {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      this.isActive = false;
    } else {
      this.isActive = true;
    }
  };
}
