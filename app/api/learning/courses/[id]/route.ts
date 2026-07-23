import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseQuery, supabaseQuerySingle, TABLES } from '@/lib/learning/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('Learning Course Detail API');

/**
 * GET /api/learning/courses/[id]
 * Get course with modules and lessons
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Fetch course
    const { data: course, error: courseErr } = await supabaseQuerySingle(TABLES.COURSES, {
      filters: { id: `eq.${id}` },
    });

    if (courseErr) {
      log.error('Failed to fetch course:', courseErr);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to fetch course', courseErr);
    }

    if (!course) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 404, 'Course not found');
    }

    // Fetch modules
    const { data: modules } = await supabaseQuery(TABLES.MODULES, {
      filters: { course_id: `eq.${id}` },
      order: { column: 'sort_order', ascending: true },
    });

    // Fetch lessons for all modules
    const moduleIds = (modules ?? []).map((m: any) => m.id);
    let lessons: any[] = [];
    if (moduleIds.length > 0) {
      const { data } = await supabaseQuery(TABLES.LESSONS, {
        filters: { module_id: `in.(${moduleIds.join(',')})` },
        order: { column: 'sort_order', ascending: true },
      });
      lessons = data ?? [];
    }

    // Combine modules with their lessons
    const modulesWithLessons = (modules ?? []).map((mod: any) => ({
      ...mod,
      lessons: lessons.filter((l: any) => l.module_id === mod.id),
    }));

    return apiSuccess({ course, modules: modulesWithLessons });
  } catch (error) {
    log.error('Course detail failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to fetch course',
      error instanceof Error ? error.message : String(error),
    );
  }
}
