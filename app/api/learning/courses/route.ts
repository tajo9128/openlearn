import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import {
  supabaseQuery,
  supabaseInsert,
  TABLES,
} from '@/lib/learning/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('Learning Courses API');

/**
 * GET /api/learning/courses
 * List ALL courses (published + coming soon) with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category');
    const difficulty = request.nextUrl.searchParams.get('difficulty');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10);
    const publishedOnly = request.nextUrl.searchParams.get('published') === 'true';

    const filters: Record<string, string> = {};
    if (publishedOnly) filters.is_published = 'eq.true';
    if (category && category !== 'all') filters.category = `eq.${category}`;
    if (difficulty && difficulty !== 'all') filters.difficulty = `eq.${difficulty}`;

    const { data, error } = await supabaseQuery(TABLES.COURSES, {
      select: '*, learning_modules(count)',
      filters,
      order: { column: 'created_at', ascending: false },
      limit,
      offset,
    });

    if (error) {
      log.error('Failed to list courses:', error);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to fetch courses', error);
    }

    return apiSuccess({ courses: data ?? [] });
  } catch (error) {
    log.error('Course listing failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to list courses',
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * POST /api/learning/courses
 * Create a new course
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, category, difficulty, instructor_name, is_free, price, duration_hours, tags } = body;

    if (!title) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing required field: title');
    }

    const { data, error } = await supabaseInsert(TABLES.COURSES, {
      title,
      description: description ?? '',
      category: category ?? 'pharmacy',
      difficulty: difficulty ?? 'beginner',
      instructor_name: instructor_name ?? 'BioDockify AI',
      is_published: false,
      is_free: is_free ?? true,
      price: price ?? 0,
      duration_hours: duration_hours ?? null,
      tags: tags ?? [],
    });

    if (error) {
      log.error('Failed to create course:', error);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to create course', error);
    }

    return apiSuccess({ course: data }, 201);
  } catch (error) {
    log.error('Course creation failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to create course',
      error instanceof Error ? error.message : String(error),
    );
  }
}
