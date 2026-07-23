import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseQuerySingle, TABLES } from '@/lib/learning/supabase-client';
import { fetchReadme, fetchRepoInfo } from '@/lib/learning/github-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('GitHub Repo Detail API');

/**
 * GET /api/learning/github/[owner]/[repo]
 * Get repo detail with README content
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  try {
    const { owner, repo } = await params;
    const fullName = `${owner}/${repo}`;

    // Try to get from database first
    const { data: dbRepo } = await supabaseQuerySingle('learning_github_repos', {
      filters: { full_name: `eq.${fullName}` },
    });

    // Fetch fresh data from GitHub
    const [ghRepo, readme] = await Promise.all([
      fetchRepoInfo(owner, repo),
      fetchReadme(owner, repo),
    ]);

    // Merge DB data with GitHub data
    const repoData = {
      ...(dbRepo ?? {}),
      ...(ghRepo ?? {}),
      readme: readme ?? dbRepo?.readme_content ?? null,
    };

    if (!repoData.full_name) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 404, 'Repository not found');
    }

    return apiSuccess({ repo: repoData });
  } catch (error) {
    log.error('Repo detail failed:', error);
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to fetch repo', String(error));
  }
}
