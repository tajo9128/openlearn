/**
 * Brain Context Builder — gathers learner data from Supabase
 *
 * Builds a compact snapshot of the student's learning state that the
 * Brain LLM can reason over for recommendations.
 */

import { supabaseQuery, TABLES } from '@/lib/learning/supabase-client';
import type {
  LearnerContext,
  EnrolledCourseInfo,
  CourseProgressInfo,
  ExerciseScoreInfo,
  ComplianceStatusInfo,
} from './brain-types';

/**
 * Gather complete learner context from all learning tables.
 */
export async function buildLearnerContext(userId: string): Promise<LearnerContext> {
  // Parallel fetch all data sources
  const [enrollmentsRes, progressRes, submissionsRes, complianceRes] = await Promise.all([
    supabaseQuery<any>(TABLES.ENROLLMENTS, {
      select: '*, learning_courses(id, title, category, difficulty, duration_hours)',
      filters: { user_id: `eq.${userId}` },
    }),
    supabaseQuery<any>(TABLES.PROGRESS, {
      filters: { user_id: `eq.${userId}` },
    }),
    supabaseQuery<any>(TABLES.EXERCISE_SUBMISSIONS, {
      filters: { user_id: `eq.${userId}` },
      order: { column: 'submitted_at', ascending: false },
    }),
    supabaseQuery<any>(TABLES.COMPLIANCE_RECORDS, {
      filters: { user_id: `eq.${userId}` },
    }),
  ]);

  const enrollments = enrollmentsRes.data ?? [];
  const progressRows = progressRes.data ?? [];
  const submissions = submissionsRes.data ?? [];
  const complianceRows = complianceRes.data ?? [];

  // Build enrolled courses
  const enrolledCourses: EnrolledCourseInfo[] = enrollments.map((e: any) => {
    const c = e.learning_courses;
    return {
      id: c?.id ?? e.course_id,
      title: c?.title ?? 'Unknown Course',
      category: c?.category ?? 'general',
      difficulty: c?.difficulty ?? 'beginner',
      duration_hours: c?.duration_hours ?? null,
    };
  });

  // Build per-course progress
  const progress: CourseProgressInfo[] = [];
  for (const enr of enrollments) {
    const courseId = enr.course_id;
    const courseInfo = enr.learning_courses;

    // Get modules + lessons for this course to count totals
    const { data: modules } = await supabaseQuery<any>(TABLES.MODULES, {
      filters: { course_id: `eq.${courseId}` },
    });
    const moduleIds = (modules ?? []).map((m: any) => m.id);
    let totalLessons = 0;
    if (moduleIds.length > 0) {
      const { data: lessons } = await supabaseQuery<any>(TABLES.LESSONS, {
        filters: { module_id: `in.(${moduleIds.join(',')})` },
        order: { column: 'sort_order', ascending: true },
      });
      totalLessons = lessons?.length ?? 0;

      // Find next incomplete lesson
      const courseProgress = progressRows.filter((p: any) => p.course_id === courseId);
      const completedLessonIds = new Set(
        courseProgress.filter((p: any) => p.status === 'completed').map((p: any) => p.lesson_id),
      );
      const nextLesson = (lessons ?? []).find((l: any) => !completedLessonIds.has(l.id));

      const lessonsCompleted = courseProgress.filter((p: any) => p.status === 'completed').length;
      progress.push({
        courseId,
        courseTitle: courseInfo?.title ?? 'Unknown',
        lessonsCompleted,
        totalLessons,
        percentage: totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0,
        nextLessonId: nextLesson?.id ?? null,
        nextLessonTitle: nextLesson?.title ?? null,
      });
    }
  }

  // Build exercise scores
  const exerciseScores: ExerciseScoreInfo[] = [];
  for (const sub of submissions.slice(0, 20)) {
    // Get exercise title
    const { data: exercise } = await supabaseQuery<any>(TABLES.EXERCISES, {
      filters: { id: `eq.${sub.exercise_id}` },
    });
    const ex = exercise?.[0];
    exerciseScores.push({
      exerciseId: sub.exercise_id,
      exerciseTitle: ex?.title ?? 'Exercise',
      courseId: ex?.course_id ?? sub.exercise_id,
      score: sub.score,
      maxScore: sub.max_score,
      percentage: sub.max_score > 0 ? Math.round((sub.score / sub.max_score) * 100) : 0,
      submittedAt: sub.submitted_at,
    });
  }

  // Build compliance status
  const complianceStatus: ComplianceStatusInfo[] = [];
  for (const rec of complianceRows) {
    const { data: course } = await supabaseQuery<any>(TABLES.COURSES, {
      filters: { id: `eq.${rec.course_id}` },
    });
    complianceStatus.push({
      courseId: rec.course_id,
      courseTitle: course?.[0]?.title ?? 'Unknown',
      status: rec.status,
      dueDate: rec.due_date,
      validUntil: rec.valid_until,
      cycleNumber: rec.cycle_number,
    });
  }

  // Compute summary stats
  const totalLessonsCompleted = progress.reduce((sum, p) => sum + p.lessonsCompleted, 0);
  const scoresWithPct = exerciseScores.map((e) => e.percentage);
  const averageScore =
    scoresWithPct.length > 0
      ? Math.round(scoresWithPct.reduce((a, b) => a + b, 0) / scoresWithPct.length)
      : null;

  // Find last active date from progress
  const allDates = progressRows.map((p: any) => p.completed_at ?? p.started_at).filter(Boolean);
  const lastActiveDate = allDates.length > 0
    ? allDates.sort().reverse()[0]
    : null;

  return {
    userId,
    enrolledCourses,
    progress,
    exerciseScores,
    complianceStatus,
    totalCoursesEnrolled: enrolledCourses.length,
    totalLessonsCompleted,
    averageScore,
    lastActiveDate,
  };
}

/**
 * Fetch course structure for study plan generation.
 */
export async function getCourseStructure(courseId: string) {
  const { data: course } = await supabaseQuery<any>(TABLES.COURSES, {
    filters: { id: `eq.${courseId}` },
  });

  const { data: modules } = await supabaseQuery<any>(TABLES.MODULES, {
    filters: { course_id: `eq.${courseId}` },
    order: { column: 'sort_order', ascending: true },
  });

  const moduleIds = (modules ?? []).map((m: any) => m.id);
  let lessons: any[] = [];
  if (moduleIds.length > 0) {
    const { data } = await supabaseQuery<any>(TABLES.LESSONS, {
      filters: { module_id: `in.(${moduleIds.join(',')})` },
      order: { column: 'sort_order', ascending: true },
    });
    lessons = data ?? [];
  }

  const { data: exercises } = await supabaseQuery<any>(TABLES.EXERCISES, {
    filters: { course_id: `eq.${courseId}` },
  });

  return {
    course: course?.[0] ?? null,
    modules: modules ?? [],
    lessons,
    exercises: exercises ?? [],
  };
}
