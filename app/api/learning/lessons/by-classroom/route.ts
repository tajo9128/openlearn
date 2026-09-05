import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseQuerySingle, TABLES } from '@/lib/learning/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('Lesson By Classroom API');

/**
 * GET /api/learning/lessons/by-classroom?classroom_id=xxx
 * Resolve the (lesson_id, course_id) that a classroom belongs to — used by
 * the player to record lesson completion when a lecture finishes.
 */
export async function GET(request: NextRequest) {
  try {
    const classroomId = request.nextUrl.searchParams.get('classroom_id');
    if (!classroomId) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing classroom_id');
    }

    const { data, error } = await supabaseQuerySingle(TABLES.LESSONS, {
      select: 'id,course_id,title',
      filters: { classroom_id: `eq.${classroomId}` },
    });

    if (error) {
      log.error('Lookup failed:', error);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Lookup failed', error);
    }
    if (!data) {
      // Standalone classroom not linked to any lesson — not an error.
      return apiSuccess({ lesson: null });
    }

    return apiSuccess({ lesson: data });
  } catch (error) {
    log.error('By-classroom lookup failed:', error);
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Lookup failed', String(error));
  }
}
