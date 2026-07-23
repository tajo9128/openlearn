/**
 * Mastery-Based Learning Engine — adapted from DeepTutor
 * Source: deeptutor/learning/policy.py + mastery.py
 *
 * Knowledge-point-typed gates:
 * - MEMORY/PROCEDURE: recency-weighted accuracy >= 0.9
 * - CONCEPT/DESIGN: qualitative Feynman-style assessment
 * - Test-out: already-mastered objectives are skipped
 */

// ==================== Types ====================

export type KnowledgeType = 'memory' | 'concept' | 'procedure' | 'design';

export interface KnowledgePoint {
  id: string;
  name: string;
  type: KnowledgeType;
  module_id: string;
  order: number;
}

export interface QuizAttempt {
  knowledge_point_id: string;
  correct: boolean;
  timestamp: number;
}

export interface ReviewTask {
  knowledge_point_id: string;
  due_at: number;
  priority: number; // lower = higher priority
}

export interface Module {
  id: string;
  title: string;
  order: number;
  knowledge_points: KnowledgePoint[];
}

export interface LearningProgress {
  mastery_levels: Record<string, number>;
  qualitative_mastery: Record<string, boolean>;
  quiz_attempts: QuizAttempt[];
  review_queue: ReviewTask[];
  modules: Module[];
  pending_question: string | null;
}

export type ObjectiveAction = 'probe' | 'practice' | 'assess' | 'review' | 'answer_pending' | 'complete';
export type ObjectiveStatus = 'new' | 'learning' | 'mastered';

export interface NextObjective {
  knowledge_point: KnowledgePoint | null;
  action: ObjectiveAction;
  status: ObjectiveStatus;
  module_title: string;
}

// ==================== Constants ====================

const QUANTITATIVE_GATE: Partial<Record<KnowledgeType, number>> = {
  memory: 0.9,
  procedure: 0.9,
};

const QUALITATIVE_TYPES = new Set<KnowledgeType>(['concept', 'design']);

const RECENCY_WEIGHTS = [0.5, 0.7, 0.85, 0.95, 1.0]; // oldest -> newest
const CONFIDENCE_CAP: Record<number, number> = { 1: 0.5, 2: 0.8 };

// ==================== Mastery Calculation ====================

/**
 * Compute recency-weighted mastery score from correctness history.
 * Only the last 5 attempts count. Newer attempts weighted more.
 * 1 attempt caps at 0.5, 2 at 0.8 (can't pass gate with luck).
 */
export function computeMastery(correctness: boolean[]): number {
  if (!correctness.length) return 0.0;

  const recent = correctness.slice(-5);
  const weights = RECENCY_WEIGHTS.slice(-recent.length);

  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < recent.length; i++) {
    weightedSum += weights[i] * (recent[i] ? 1.0 : 0.0);
    weightTotal += weights[i];
  }

  const score = weightedSum / weightTotal;
  return Math.min(score, CONFIDENCE_CAP[recent.length] ?? 1.0);
}

/**
 * Get the gate threshold for a knowledge point type.
 */
export function gateThreshold(type: KnowledgeType): number {
  if (QUALITATIVE_TYPES.has(type)) return 1.0;
  return QUANTITATIVE_GATE[type] ?? 0.9;
}

/**
 * Check if a knowledge point is mastered.
 */
export function isMastered(progress: LearningProgress, kp: KnowledgePoint): boolean {
  if (QUALITATIVE_TYPES.has(kp.type)) {
    return Boolean(progress.qualitative_mastery[kp.id] ?? false);
  }
  return (progress.mastery_levels[kp.id] ?? 0.0) >= gateThreshold(kp.type);
}

/**
 * Get the status of a knowledge point for a learner.
 */
export function objectiveStatus(progress: LearningProgress, kp: KnowledgePoint): ObjectiveStatus {
  if (isMastered(progress, kp)) return 'mastered';
  const hasAttempts = progress.quiz_attempts.some(a => a.knowledge_point_id === kp.id);
  const hasQualitative = kp.id in progress.qualitative_mastery;
  if (hasAttempts || hasQualitative) return 'learning';
  return 'new';
}

// ==================== Next Objective Selection ====================

/**
 * Determine the next learning objective.
 * Precedence: pending question > due reviews > first not-mastered KP > complete.
 * Already-mastered KPs are skipped (test-out compression).
 */
export function nextObjective(progress: LearningProgress, now = Date.now()): NextObjective {
  // 1. Pending question takes priority
  if (progress.pending_question) {
    const kp = findKpById(progress, progress.pending_question);
    return {
      knowledge_point: kp,
      action: 'answer_pending',
      status: kp ? objectiveStatus(progress, kp) : 'learning',
      module_title: kp ? getModuleTitle(progress, kp.module_id) : '',
    };
  }

  // 2. Due reviews (spaced repetition)
  const dueReviews = progress.review_queue
    .filter(t => t.due_at <= now)
    .sort((a, b) => a.priority - b.priority);

  if (dueReviews.length > 0) {
    const review = dueReviews[0];
    const kp = findKpById(progress, review.knowledge_point_id);
    return {
      knowledge_point: kp,
      action: 'review',
      status: kp ? objectiveStatus(progress, kp) : 'mastered',
      module_title: kp ? getModuleTitle(progress, kp.module_id) : '',
    };
  }

  // 3. First not-mastered KP in module order, then KP order
  const sortedModules = [...progress.modules].sort((a, b) => a.order - b.order);

  for (const module of sortedModules) {
    const sortedKps = [...module.knowledge_points].sort((a, b) => a.order - b.order);

    for (const kp of sortedKps) {
      if (isMastered(progress, kp)) continue; // Skip mastered (test-out)

      const status = objectiveStatus(progress, kp);
      let action: ObjectiveAction;

      if (status === 'new') {
        action = 'probe';
      } else if (QUALITATIVE_TYPES.has(kp.type)) {
        action = 'assess';
      } else {
        action = 'practice';
      }

      return {
        knowledge_point: kp,
        action,
        status,
        module_title: module.title,
      };
    }
  }

  // 4. All mastered
  return {
    knowledge_point: null,
    action: 'complete',
    status: 'mastered',
    module_title: '',
  };
}

// ==================== Answer Grading ====================

/**
 * Grade an answer and update mastery levels.
 */
export function gradeAnswer(
  progress: LearningProgress,
  kp: KnowledgePoint,
  isCorrect: boolean,
): LearningProgress {
  const newAttempt: QuizAttempt = {
    knowledge_point_id: kp.id,
    correct: isCorrect,
    timestamp: Date.now(),
  };

  const allAttempts = [
    ...progress.quiz_attempts.filter(a => a.knowledge_point_id === kp.id),
    newAttempt,
  ];

  const correctness = allAttempts.map(a => a.correct);
  const mastery = computeMastery(correctness);

  return {
    ...progress,
    quiz_attempts: [...progress.quiz_attempts, newAttempt],
    mastery_levels: {
      ...progress.mastery_levels,
      [kp.id]: mastery,
    },
  };
}

/**
 * Record a qualitative assessment result (for CONCEPT/DESIGN types).
 */
export function recordQualitativeAssessment(
  progress: LearningProgress,
  kpId: string,
  passed: boolean,
): LearningProgress {
  return {
    ...progress,
    qualitative_mastery: {
      ...progress.qualitative_mastery,
      [kpId]: passed,
    },
  };
}

// ==================== Helpers ====================

function findKpById(progress: LearningProgress, kpId: string): KnowledgePoint | null {
  for (const module of progress.modules) {
    const kp = module.knowledge_points.find(k => k.id === kpId);
    if (kp) return kp;
  }
  return null;
}

function getModuleTitle(progress: LearningProgress, moduleId: string): string {
  return progress.modules.find(m => m.id === moduleId)?.title ?? '';
}

/**
 * Calculate overall course progress percentage.
 */
export function courseProgressPercent(progress: LearningProgress): number {
  const allKps = progress.modules.flatMap(m => m.knowledge_points);
  if (allKps.length === 0) return 0;

  const mastered = allKps.filter(kp => isMastered(progress, kp)).length;
  return Math.round((mastered / allKps.length) * 100);
}

/**
 * Get mastery summary for all knowledge points.
 */
export function getMasterySummary(progress: LearningProgress): {
  total: number;
  mastered: number;
  learning: number;
  new: number;
  byType: Record<KnowledgeType, { total: number; mastered: number }>;
} {
  const allKps = progress.modules.flatMap(m => m.knowledge_points);
  const byType: Record<string, { total: number; mastered: number }> = {};

  let mastered = 0, learning = 0, newCount = 0;

  for (const kp of allKps) {
    if (!byType[kp.type]) byType[kp.type] = { total: 0, mastered: 0 };
    byType[kp.type].total++;

    const status = objectiveStatus(progress, kp);
    if (status === 'mastered') {
      mastered++;
      byType[kp.type].mastered++;
    } else if (status === 'learning') {
      learning++;
    } else {
      newCount++;
    }
  }

  return {
    total: allKps.length,
    mastered,
    learning,
    new: newCount,
    byType: byType as Record<KnowledgeType, { total: number; mastered: number }>,
  };
}
