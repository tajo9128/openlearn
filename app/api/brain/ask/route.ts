import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { answerQuestion } from '@/lib/brain/brain-recommender';
import { createLogger } from '@/lib/logger';

const log = createLogger('Brain Ask API');

export async function POST(request: NextRequest) {
  try {
    const { user_id, course_id, question } = await request.json();

    if (!user_id || !course_id || !question) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id, course_id, or question');
    }

    // BYOK: read model/key from headers
    const modelOpts = {
      modelString: request.headers.get('x-model') ?? undefined,
      apiKey: request.headers.get('x-api-key') ?? undefined,
      baseUrl: request.headers.get('x-base-url') ?? undefined,
      providerType: request.headers.get('x-provider-type') ?? undefined,
    };

    const result = await answerQuestion(user_id, course_id, question, modelOpts);
    return apiSuccess(result);
  } catch (error) {
    log.error('Brain Q&A failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to answer question',
      error instanceof Error ? error.message : String(error),
    );
  }
}
