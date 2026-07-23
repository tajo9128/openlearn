import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseQuery, TABLES } from '@/lib/learning/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('GitHub Repos API');

/**
 * GET /api/learning/github
 * List GitHub repos with optional category filter
 */
export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category');
    const featured = request.nextUrl.searchParams.get('featured') === 'true';
    const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10);

    const filters: Record<string, string> = {};
    if (category && category !== 'all') filters.category = `eq.${category}`;
    if (featured) filters.is_featured = 'eq.true';

    const { data, error } = await supabaseQuery('learning_github_repos', {
      filters,
      order: { column: 'stars', ascending: false },
      limit,
    });

    if (error) {
      log.error('Failed to list repos:', error);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to fetch repos', error);
    }

    return apiSuccess({ repos: data ?? [] });
  } catch (error) {
    log.error('Repo listing failed:', error);
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to list repos', String(error));
  }
}
