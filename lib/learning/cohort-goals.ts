/**
 * Cohort Goal Evaluator — adapted from ClassroomIO
 * Source: /opt/classroomio/apps/api/src/services/cohort/goal.ts
 *
 * Goal types: complete_all, n_of_m, score, pass_rate, readiness
 * Deadline kinds: absolute, relative_to_join, recurring, none
 * Statuses: not_started, in_progress, completed, at_risk, overdue, waived
 */

import {
  supabaseQuery,
  supabaseQuerySingle,
  supabaseInsert,
  supabaseUpsert,
  TABLES,
} from './supabase-client';

const AT_RISK_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// ==================== Goal CRUD ====================

export async function createGoal(
  cohortId: string,
  data: {
    title: string;
    description?: string;
    type: 'complete_all' | 'n_of_m' | 'score' | 'pass_rate' | 'readiness';
    courseIds: string[];
    requiredCount?: number;
    scoreThreshold?: number;
    teamPassRateThreshold?: number;
    deadlineKind: 'absolute' | 'relative_to_join' | 'recurring' | 'none';
    deadlineDate?: string;
    relativeDays?: number;
    recurringMonths?: number;
    reminderDaysBefore?: number[];
  },
  createdBy: string,
): Promise<any> {
  const { data: goal, error } = await supabaseInsert(TABLES.COHORT_GOALS, {
    cohort_id: cohortId,
    title: data.title,
    description: data.description ?? null,
    type: data.type,
    course_ids: data.courseIds,
    required_count: data.requiredCount ?? null,
    score_threshold: data.scoreThreshold ?? null,
    team_pass_rate_threshold: data.teamPassRateThreshold ?? null,
    deadline_kind: data.deadlineKind,
    deadline_date: data.deadlineDate ?? null,
    relative_days: data.relativeDays ?? null,
    recurring_months: data.recurringMonths ?? null,
    reminder_days_before: data.reminderDaysBefore ?? [7, 1],
    created_by: createdBy,
  });

  if (error) throw new Error(`Failed to create goal: ${error}`);

  // Initial evaluation
  await evaluateGoal(goal.id).catch(() => {});

  return goal;
}

export async function listGoals(cohortId: string): Promise<any[]> {
  const { data } = await supabaseQuery<any>(TABLES.COHORT_GOALS, {
    filters: { cohort_id: `eq.${cohortId}`, status: 'eq.active' },
    order: { column: 'created_at', ascending: false },
  });
  return data ?? [];
}

export async function getGoal(goalId: string): Promise<any | null> {
  const { data } = await supabaseQuerySingle<any>(TABLES.COHORT_GOALS, {
    filters: { id: `eq.${goalId}` },
  });
  return data;
}

// ==================== Goal Evaluator ====================

function computeDueDate(goal: any, joinedAt: Date): Date | null {
  if (goal.deadline_kind === 'none') return null;
  if (goal.deadline_kind === 'absolute') {
    return goal.deadline_date ? new Date(goal.deadline_date) : null;
  }
  if (goal.deadline_kind === 'relative_to_join') {
    if (!goal.relative_days) return null;
    return new Date(joinedAt.getTime() + goal.relative_days * DAY_MS);
  }
  if (goal.deadline_kind === 'recurring') {
    return goal.deadline_date ? new Date(goal.deadline_date) : null;
  }
  return null;
}

function decideStatus(args: {
  completed: number;
  required: number;
  dueDate: Date | null;
  now: Date;
  previousStatus: string | null;
}): { status: string; completedAt: Date | null } {
  const { completed, required, dueDate, now, previousStatus } = args;
  if (previousStatus === 'waived') return { status: 'waived', completedAt: null };
  if (required > 0 && completed >= required) return { status: 'completed', completedAt: now };
  if (dueDate && now.getTime() > dueDate.getTime()) return { status: 'overdue', completedAt: null };
  if (dueDate && dueDate.getTime() - now.getTime() < AT_RISK_DAYS * DAY_MS)
    return { status: 'at_risk', completedAt: null };
  if (completed > 0) return { status: 'in_progress', completedAt: null };
  return { status: 'not_started', completedAt: null };
}

export async function evaluateGoal(goalId: string): Promise<{ evaluated: number }> {
  const goal = await getGoal(goalId);
  if (!goal) return { evaluated: 0 };

  // Get all student members of the cohort
  const { data: members } = await supabaseQuery<any>(TABLES.COHORT_MEMBERS, {
    filters: { cohort_id: `eq.${goal.cohort_id}`, role: 'eq.student' },
  });

  const students = (members ?? []).filter((m: any) => m.user_id);
  if (students.length === 0) return { evaluated: 0 };

  const courseIds: string[] = goal.course_ids ?? [];
  const now = new Date();

  // Get existing assignments
  const { data: existingAssignments } = await supabaseQuery<any>(TABLES.GOAL_ASSIGNMENTS, {
    filters: { goal_id: `eq.${goalId}` },
  });
  const previousMap = new Map(
    (existingAssignments ?? []).map((a: any) => [a.cohort_member_id, a]),
  );

  let evaluated = 0;
  for (const member of students) {
    const joinedAt = member.created_at ? new Date(member.created_at) : now;
    const dueDate = computeDueDate(goal, joinedAt);

    // Count completed courses for this student
    let completedCount = 0;
    for (const courseId of courseIds) {
      if (await isCourseCompleted(member.user_id, courseId, goal)) {
        completedCount++;
      }
    }

    const required =
      goal.type === 'n_of_m' && goal.required_count
        ? Math.min(goal.required_count, courseIds.length)
        : courseIds.length;

    const previous = previousMap.get(member.id);
    const decision = decideStatus({
      completed: completedCount,
      required,
      dueDate,
      now,
      previousStatus: previous?.status ?? null,
    });

    // Upsert assignment
    await supabaseUpsert(
      TABLES.GOAL_ASSIGNMENTS,
      {
        goal_id: goalId,
        cohort_member_id: member.id,
        due_date: dueDate?.toISOString() ?? null,
        status: decision.status,
        completed_count: completedCount,
        required_count: required,
        completed_at:
          decision.status === 'completed'
            ? (previous?.completed_at ?? decision.completedAt?.toISOString() ?? null)
            : null,
        last_evaluated_at: now.toISOString(),
      },
      'goal_id,cohort_member_id',
    );

    evaluated++;
  }

  return { evaluated };
}

async function isCourseCompleted(userId: string, courseId: string, goal: any): Promise<boolean> {
  // Check learning_progress
  const { data: progress } = await supabaseQuery<any>(TABLES.PROGRESS, {
    filters: { user_id: `eq.${userId}`, course_id: `eq.${courseId}`, status: 'eq.completed' },
  });

  // Count total lessons
  const { data: modules } = await supabaseQuery<any>(TABLES.MODULES, {
    filters: { course_id: `eq.${courseId}` },
  });
  const moduleIds = (modules ?? []).map((m: any) => m.id);
  let totalLessons = 0;
  if (moduleIds.length > 0) {
    const { data: lessons } = await supabaseQuery<any>(TABLES.LESSONS, {
      filters: { module_id: `in.(${moduleIds.join(',')})` },
    });
    totalLessons = lessons?.length ?? 0;
  }

  const lessonsCompleted = progress?.length ?? 0;
  const allLessonsDone = totalLessons > 0 && lessonsCompleted >= totalLessons;

  // For score/pass_rate goals, also check exercise scores
  if (goal.type === 'score' || goal.type === 'pass_rate') {
    const { data: exercises } = await supabaseQuery<any>(TABLES.EXERCISES, {
      filters: { course_id: `eq.${courseId}` },
    });
    let passedExercises = 0;
    const totalExercises = exercises?.length ?? 0;

    for (const exercise of exercises ?? []) {
      const { data: subs } = await supabaseQuery<any>(TABLES.EXERCISE_SUBMISSIONS, {
        filters: { user_id: `eq.${userId}`, exercise_id: `eq.${exercise.id}` },
        order: { column: 'submitted_at', ascending: false },
        limit: 1,
      });
      if (subs?.length > 0) {
        const pct = subs[0].max_score > 0 ? (subs[0].score / subs[0].max_score) * 100 : 0;
        if (pct >= (goal.score_threshold ?? 80)) passedExercises++;
      }
    }

    const scorePct = totalExercises > 0 ? Math.round((passedExercises / totalExercises) * 100) : 0;
    const meetsThreshold = scorePct >= (goal.score_threshold ?? 80);
    return allLessonsDone && (totalExercises === 0 || meetsThreshold);
  }

  return allLessonsDone;
}

// ==================== Cron: Evaluate All Goals ====================

export async function runCohortGoalEvaluationSweep(): Promise<{
  goalsEvaluated: number;
  assignmentsEvaluated: number;
}> {
  const { data: goals } = await supabaseQuery<any>(TABLES.COHORT_GOALS, {
    filters: { status: 'eq.active' },
  });

  let assignmentsEvaluated = 0;
  for (const goal of goals ?? []) {
    try {
      const result = await evaluateGoal(goal.id);
      assignmentsEvaluated += result.evaluated;
    } catch (error) {
      console.error(`Goal evaluation failed for ${goal.id}:`, error);
    }
  }

  return { goalsEvaluated: goals?.length ?? 0, assignmentsEvaluated };
}

// ==================== Cron: Send Reminders ====================

export async function runCohortGoalReminderScan(): Promise<{
  scanned: number;
  remindersEnqueued: number;
}> {
  const now = new Date();
  const { data: assignments } = await supabaseQuery<any>(TABLES.GOAL_ASSIGNMENTS, {
    filters: {
      status: 'in.(not_started,in_progress,at_risk)',
      due_date: 'not.is.null',
    },
    select: '*, learning_cohort_goals(title, reminder_days_before, cohort_id)',
  });

  let remindersEnqueued = 0;
  for (const assignment of assignments ?? []) {
    if (!assignment.due_date) continue;

    const dueDate = new Date(assignment.due_date);
    if (isNaN(dueDate.getTime())) continue;

    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / DAY_MS);
    const goal = assignment.learning_cohort_goals;
    const reminderDays: number[] = goal?.reminder_days_before ?? [7, 1];
    const isOverdueDay = daysUntilDue === 0;
    const matchesReminder =
      (daysUntilDue > 0 && reminderDays.includes(daysUntilDue)) || isOverdueDay;

    if (!matchesReminder) continue;

    // Here we would enqueue an email via the email module
    // For now, just count it
    remindersEnqueued++;
  }

  return { scanned: assignments?.length ?? 0, remindersEnqueued };
}

// ==================== Goal Assignment Overview ====================

export async function getGoalAssignments(goalId: string): Promise<any[]> {
  const { data } = await supabaseQuery<any>(TABLES.GOAL_ASSIGNMENTS, {
    select: '*, learning_cohort_members(user_id, email, role)',
    filters: { goal_id: `eq.${goalId}` },
  });
  return data ?? [];
}

export async function getCohortGoalSummary(cohortId: string): Promise<any[]> {
  const goals = await listGoals(cohortId);
  const result = [];

  for (const goal of goals) {
    const assignments = await getGoalAssignments(goal.id);
    const statusCounts: Record<string, number> = {};
    for (const a of assignments) {
      statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
    }
    result.push({ ...goal, statusCounts, totalLearners: assignments.length });
  }

  return result;
}
