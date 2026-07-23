import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { getStudyPlan } from '@/lib/brain/brain-recommender';
import { createLogger } from '@/lib/logger';

const log = createLogger('Brain Study Plan API');

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id');
    const courseId = request.nextUrl.searchParams.get('course_id');
    const days = parseInt(request.nextUrl.searchParams.get('days') ?? '7', 10);

    if (!userId || !courseId) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id or course_id');
    }

    const modelOpts = {
      modelString: request.headers.get('x-model') ?? undefined,
      apiKey: request.headers.get('x-api-key') ?? undefined,
      baseUrl: request.headers.get('x-base-url') ?? undefined,
      providerType: request.headers.get('x-provider-type') ?? undefined,
    };

    const plan = await getStudyPlan(userId, courseId, days, modelOpts);
    return apiSuccess({ plan });
  } catch (error) {
    log.error('Study plan failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to generate study plan',
      error instanceof Error ? error.message : String(error),
    );
  }
}
