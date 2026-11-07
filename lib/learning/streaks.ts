/**
 * Learning streak tracking — localStorage-based daily activity counter.
 * Updated on lesson visits and completions; shown on the dashboard.
 */

const STREAK_KEY = 'biodockify_streak';

interface StreakData {
  lastActiveDate: string; // YYYY-MM-DD
  currentStreak: number;
  longestStreak: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function getStreak(): StreakData {
  if (typeof window === 'undefined') {
    return { lastActiveDate: '', currentStreak: 0, longestStreak: 0 };
  }
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { lastActiveDate: '', currentStreak: 0, longestStreak: 0 };
    return JSON.parse(raw) as StreakData;
  } catch {
    return { lastActiveDate: '', currentStreak: 0, longestStreak: 0 };
  }
}

/**
 * Call on any learning activity (lesson view, completion, practice).
 * Idempotent within the same day.
 */
export function recordStreakActivity(): StreakData {
  if (typeof window === 'undefined') return getStreak();

  const streak = getStreak();
  const today = todayStr();

  if (streak.lastActiveDate === today) {
    return streak; // already counted today
  }

  const next: StreakData = {
    lastActiveDate: today,
    currentStreak: streak.lastActiveDate === yesterdayStr() ? streak.currentStreak + 1 : 1,
    longestStreak: 0,
  };
  next.longestStreak = Math.max(streak.longestStreak, next.currentStreak);

  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  } catch {
    // storage full — non-critical
  }
  return next;
}
