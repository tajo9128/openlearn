import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseQuery, TABLES } from '@/lib/learning/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('Learning Exercises API');

/**
 * GET /api/learning/exercises?lesson_id=xxx | course_id=xxx
 * List exercises (with their questions) for a lesson or a course.
 * The practice page consumes this shape: { exercises: [...] }.
 */
export async function GET(request: NextRequest) {
  try {
    const lessonId = request.nextUrl.searchParams.get('lesson_id');
    const courseId = request.nextUrl.searchParams.get('course_id');

    if (!lessonId && !courseId) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing lesson_id or course_id');
    }

    const filters: Record<string, string> = lessonId
      ? { lesson_id: `eq.${lessonId}` }
      : { course_id: `eq.${courseId}` };

    const { data, error } = await supabaseQuery(TABLES.EXERCISES, {
      select: '*',
      filters,
    });

    if (error) {
      log.error('Failed to fetch exercises:', error);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to fetch exercises', error);
    }

    // Attach questions to each exercise in one query when any exercises exist.
    let exercises = data ?? [];
    if (exercises.length > 0) {
      const ids = exercises.map((e: any) => e.id).join(',');
      const { data: questions, error: qErr } = await supabaseQuery(TABLES.EXERCISE_QUESTIONS, {
        select: '*',
        filters: { exercise_id: `in.(${ids})` },
        order: { column: 'sort_order', ascending: true },
      });
      if (!qErr && questions) {
        const byExercise = new Map<string, any[]>();
        for (const q of questions) {
          const list = byExercise.get(q.exercise_id) ?? [];
          list.push(q);
          byExercise.set(q.exercise_id, list);
        }
        exercises = exercises.map((e: any) => ({ ...e, questions: byExercise.get(e.id) ?? [] }));
      }
    }

    return apiSuccess({ exercises });
  } catch (error) {
    log.error('Exercises listing failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to fetch exercises',
      error instanceof Error ? error.message : String(error),
    );
  }
}
