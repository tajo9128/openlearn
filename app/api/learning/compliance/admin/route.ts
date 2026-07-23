import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { resetCourseCompliance, waiveCourseCompliance } from '@/lib/learning/compliance';
import { createLogger } from '@/lib/logger';

const log = createLogger('Compliance Admin API');

/**
 * POST /api/learning/compliance/reset
 * POST /api/learning/compliance/waive
 * POST /api/learning/compliance/extend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, course_id, user_ids, due_date, waived_by, waiver_reason, waiver_expires_at } = body;

    if (!course_id || !user_ids || !Array.isArray(user_ids)) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing course_id or user_ids');
    }

    let result;
    switch (action) {
      case 'reset':
        if (!due_date) return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing due_date');
        result = await resetCourseCompliance(course_id, user_ids, due_date);
        break;
      case 'waive':
        result = await waiveCourseCompliance(course_id, user_ids, waived_by, waiver_reason, waiver_expires_at);
        break;
      default:
        return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, `Unknown action: ${action}`);
    }

    return apiSuccess({ result });
  } catch (error) {
    log.error('Compliance admin action failed:', error);
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Admin action failed', String(error));
  }
}
