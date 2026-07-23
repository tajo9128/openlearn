import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseQuery, supabaseQuerySingle, supabaseInsert, TABLES } from '@/lib/learning/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('Learning Enroll API');

/**
 * POST /api/learning/enroll
 * Enroll user in a course (creates group + groupmember in ClassroomIO pattern)
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id, course_id } = await request.json();

    if (!user_id || !course_id) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id or course_id');
    }

    // Check existing enrollment
    const { data: existing } = await supabaseQuerySingle(TABLES.ENROLLMENTS, {
      filters: { user_id: `eq.${user_id}`, course_id: `eq.${course_id}` },
    });

    if (existing) {
      return apiSuccess({ enrollment: existing, message: 'Already enrolled' });
    }

    // Create enrollment
    const { data, error } = await supabaseInsert(TABLES.ENROLLMENTS, {
      user_id,
      course_id,
    });

    if (error) {
      log.error('Failed to enroll:', error);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to enroll', error);
    }

    return apiSuccess({ enrollment: data }, 201);
  } catch (error) {
    log.error('Enrollment failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to enroll',
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * GET /api/learning/enroll?user_id=xxx
 * Get user's enrollments
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id');
    if (!userId) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id parameter');
    }

    const { data, error } = await supabaseQuery(TABLES.ENROLLMENTS, {
      select: '*, learning_courses(*)',
      filters: { user_id: `eq.${userId}` },
    });

    if (error) {
      log.error('Failed to fetch enrollments:', error);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to fetch enrollments', error);
    }

    return apiSuccess({ enrollments: data ?? [] });
  } catch (error) {
    log.error('Enrollment listing failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to fetch enrollments',
      error instanceof Error ? error.message : String(error),
    );
  }
}
