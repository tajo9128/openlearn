import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { syncComplianceProgressFromSubmission } from '@/lib/learning/compliance';
import { createLogger } from '@/lib/logger';

const log = createLogger('Compliance Sync API');

export async function POST(request: NextRequest) {
  try {
    const { user_id, course_id } = await request.json();
    if (!user_id || !course_id) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id or course_id');
    }

    const result = await syncComplianceProgressFromSubmission(course_id, user_id);
    return apiSuccess({ result: result ?? { status: 'not_compliance_course' } });
  } catch (error) {
    log.error('Compliance sync failed:', error);
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Compliance sync failed', String(error));
  }
}
