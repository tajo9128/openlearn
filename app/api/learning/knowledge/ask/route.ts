import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { askOverDocuments } from '@/lib/learning/knowledge';
import { createLogger } from '@/lib/logger';

const log = createLogger('Knowledge Ask API');

/**
 * POST /api/learning/knowledge/ask
 * AI Q&A over user's documents
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id, question } = await request.json();

    if (!user_id || !question) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id or question');
    }

    // BYOK: read model/key from headers
    const modelOpts = {
      modelString: request.headers.get('x-model') ?? undefined,
      apiKey: request.headers.get('x-api-key') ?? undefined,
      baseUrl: request.headers.get('x-base-url') ?? undefined,
      providerType: request.headers.get('x-provider-type') ?? undefined,
    };

    const result = await askOverDocuments(user_id, question, modelOpts);
    return apiSuccess(result);
  } catch (error) {
    log.error('Knowledge Q&A failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to answer question',
      error instanceof Error ? error.message : String(error),
    );
  }
}
