import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { getCourseComplianceOverview } from '@/lib/learning/compliance';

export async function GET(request: NextRequest) {
  try {
    const courseId = request.nextUrl.searchParams.get('course_id');
    if (!courseId) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing course_id');
    }
    const overview = await getCourseComplianceOverview(courseId);
    return apiSuccess({ overview });
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to get overview', String(error));
  }
}
