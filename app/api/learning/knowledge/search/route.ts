import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { searchDocuments } from '@/lib/learning/knowledge';
import { createLogger } from '@/lib/logger';

const log = createLogger('Knowledge Search API');

/**
 * GET /api/learning/knowledge/search?user_id=xxx&query=yyy
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id');
    const query = request.nextUrl.searchParams.get('query') ?? request.nextUrl.searchParams.get('q') ?? '';
    const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '10', 10);

    if (!userId) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id');
    }

    if (!query.trim()) {
      return apiSuccess({ results: [] });
    }

    const results = await searchDocuments(userId, query, limit);
    return apiSuccess({ results, query });
  } catch (error) {
    log.error('Search failed:', error);
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Search failed', String(error));
  }
}
