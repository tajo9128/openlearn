import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseQuery, supabaseUpsert, TABLES } from '@/lib/learning/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('Learning Progress API');

/**
 * POST /api/learning/progress
 * Update lesson progress (upsert = create or update)
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id, lesson_id, course_id, status, score, time_spent_seconds } = await request.json();

    if (!user_id || !lesson_id || !course_id) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id, lesson_id, or course_id');
    }

    const row: Record<string, unknown> = {
      user_id,
      lesson_id,
      course_id,
      status: status ?? 'in_progress',
    };

    if (score !== undefined) row.score = score;
    if (time_spent_seconds) row.time_spent_seconds = time_spent_seconds;
    if (status === 'in_progress') row.started_at = new Date().toISOString();
    if (status === 'completed') row.completed_at = new Date().toISOString();

    const { data, error } = await supabaseUpsert(TABLES.PROGRESS, row, 'user_id,lesson_id');

    if (error) {
      log.error('Failed to update progress:', error);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to update progress', error);
    }

    return apiSuccess({ progress: data });
  } catch (error) {
    log.error('Progress update failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to update progress',
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * GET /api/learning/progress?user_id=xxx&course_id=yyy
 * Get user's progress for a course
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id');
    const courseId = request.nextUrl.searchParams.get('course_id');

    if (!userId) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id parameter');
    }

    const filters: Record<string, string> = { user_id: `eq.${userId}` };
    if (courseId) filters.course_id = `eq.${courseId}`;

    const { data, error } = await supabaseQuery(TABLES.PROGRESS, { filters });

    if (error) {
      log.error('Failed to fetch progress:', error);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to fetch progress', error);
    }

    const progress = data ?? [];
    const completed = progress.filter((p: any) => p.status === 'completed').length;

    return apiSuccess({ progress, completed, total: progress.length });
  } catch (error) {
    log.error('Progress listing failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to fetch progress',
      error instanceof Error ? error.message : String(error),
    );
  }
}
