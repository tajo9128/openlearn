/**
 * Progression system adapted from ClassroomIO
 * Source: /opt/classroomio/packages/core/src/services/course/progression.ts
 *
 * Supports two modes:
 * - free: all published content is accessible
 * - sequential: prior items must be complete before next item is accessible
 */

export type ProgressionMode = 'free' | 'sequential';

export interface ProgressableItem {
  id: string;
  type: 'lesson' | 'exercise';
  order: number;
  isComplete: boolean;
  isUnlocked: boolean;
  completionPolicy?: string; // 'manual' | 'automatic' | 'none'
  passThreshold?: number;
}

export interface AccessAnnotation {
  accessible: boolean;
  lockReason: null | 'teacher_locked' | 'progression_blocked';
}

/**
 * Annotate items with access information based on progression mode.
 * In sequential mode, items after an incomplete item are blocked.
 */
export function annotateNavigableAccess(
  items: ProgressableItem[],
  mode: ProgressionMode,
): (ProgressableItem & AccessAnnotation)[] {
  if (mode === 'free') {
    return items.map((item) => ({
      ...item,
      accessible: item.isUnlocked,
      lockReason: item.isUnlocked ? null : 'teacher_locked',
    }));
  }

  // Sequential mode
  let priorBlockingComplete = true;

  return items.map((item) => {
    if (!item.isUnlocked) {
      return { ...item, accessible: false, lockReason: 'teacher_locked' as const };
    }

    if (!priorBlockingComplete) {
      return { ...item, accessible: false, lockReason: 'progression_blocked' as const };
    }

    // Check if this item blocks progression
    const blocksProgression =
      (item.type === 'lesson' && item.completionPolicy !== 'none') ||
      item.type === 'exercise';

    if (blocksProgression && !item.isComplete) {
      priorBlockingComplete = false;
    }

    return { ...item, accessible: true, lockReason: null };
  });
}

/**
 * Calculate course progress percentage
 * Source: /opt/classroomio/apps/api/src/utils/course-completion.ts
 */
export function calcCourseProgressPercent(params: {
  lessonsCompleted: number;
  totalLessons: number;
  exercisesCompleted: number;
  exercisesCount: number;
}): number {
  const totalItems = params.totalLessons + params.exercisesCount;
  if (totalItems === 0) return 0;
  const completedItems = params.lessonsCompleted + params.exercisesCompleted;
  return Math.round((completedItems / totalItems) * 100);
}

/**
 * Check if a student has earned a certificate.
 * Adapted from ClassroomIO's evaluateCourseCertification().
 *
 * Criteria:
 * 1. All lessons must be complete
 * 2. All exercises must have passing scores (if passThreshold set)
 * 3. If a requiredExerciseId is set, that specific exercise must be passed
 */
export function evaluateCertificateEligibility(params: {
  lessonsCompleted: number;
  totalLessons: number;
  exercisesPassed: number;
  totalExercises: number;
  requiredExercisePassed?: boolean;
  passThreshold?: number;
}): { eligible: boolean; reason?: string } {
  if (params.totalLessons > 0 && params.lessonsCompleted < params.totalLessons) {
    return {
      eligible: false,
      reason: `${params.lessonsCompleted}/${params.totalLessons} lessons completed`,
    };
  }

  if (params.totalExercises > 0 && params.exercisesPassed < params.totalExercises) {
    return {
      eligible: false,
      reason: `${params.exercisesPassed}/${params.totalExercises} exercises passed`,
    };
  }

  if (params.requiredExercisePassed === false) {
    return { eligible: false, reason: 'Required exercise not passed' };
  }

  return { eligible: true };
}

/**
 * Generate a unique certificate number
 */
export function generateCertificateNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BD-${timestamp}-${random}`;
}
