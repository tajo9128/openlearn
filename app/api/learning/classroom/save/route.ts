import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseUpsert, TABLES } from '@/lib/learning/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('Classroom Save API');

/**
 * POST /api/learning/classroom/save
 * Save classroom_id to lesson record (called after generation succeeds).
 */
export async function POST(request: NextRequest) {
  try {
    const { lesson_id, classroom_id } = await request.json();

    if (!lesson_id || !classroom_id) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing lesson_id or classroom_id');
    }

    await supabaseUpsert(TABLES.LESSONS, {
      id: lesson_id,
      classroom_id: classroom_id,
    }, 'id');

    return apiSuccess({ saved: true, lesson_id, classroom_id });
  } catch (error) {
    log.error('Failed to save classroom:', error);
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to save', String(error));
  }
}
