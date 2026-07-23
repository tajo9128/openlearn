import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { getRecommendations } from '@/lib/brain/brain-recommender';
import { createLogger } from '@/lib/logger';

const log = createLogger('Brain Recommend API');

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id');
    if (!userId) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id');
    }

    // BYOK: read model/key from headers (same pattern as OpenMAIC chat)
    const modelOpts = {
      modelString: request.headers.get('x-model') ?? undefined,
      apiKey: request.headers.get('x-api-key') ?? undefined,
      baseUrl: request.headers.get('x-base-url') ?? undefined,
      providerType: request.headers.get('x-provider-type') ?? undefined,
    };

    const result = await getRecommendations(userId, modelOpts);
    return apiSuccess(result);
  } catch (error) {
    log.error('Recommendation failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to generate recommendations',
      error instanceof Error ? error.message : String(error),
    );
  }
}
