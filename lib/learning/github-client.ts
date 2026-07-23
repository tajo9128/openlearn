/**
 * GitHub API Client — fetches repo data for GitHub Learning
 *
 * Uses GitHub's public REST API (no auth needed for public repos).
 * Rate limit: 60 requests/hour without auth.
 */

const GITHUB_API = 'https://api.github.com';
const GITHUB_HEADERS = {
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'BioDockify-Learn',
};

export interface GitHubRepo {
  owner: string;
  repo: string;
  full_name: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  url: string;
  homepage: string | null;
  created_at: string;
  updated_at: string;
  default_branch: string;
}

export interface GitHubReadme {
  content: string; // base64 decoded
  encoding: string;
  size: number;
}

/**
 * Fetch repository metadata from GitHub API.
 */
export async function fetchRepoInfo(owner: string, repo: string): Promise<GitHubRepo | null> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
      headers: GITHUB_HEADERS,
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      owner: data.owner?.login ?? owner,
      repo: data.name ?? repo,
      full_name: data.full_name ?? `${owner}/${repo}`,
      description: data.description ?? '',
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      language: data.language ?? '',
      topics: data.topics ?? [],
      url: data.html_url ?? `https://github.com/${owner}/${repo}`,
      homepage: data.homepage ?? null,
      created_at: data.created_at ?? '',
      updated_at: data.updated_at ?? '',
      default_branch: data.default_branch ?? 'main',
    };
  } catch {
    return null;
  }
}

/**
 * Fetch README content from GitHub (returns decoded text).
 */
export async function fetchReadme(owner: string, repo: string): Promise<string | null> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, {
      headers: GITHUB_HEADERS,
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.encoding === 'base64' && data.content) {
      // Decode base64
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch repository tree (folder structure) from GitHub.
 */
export async function fetchRepoTree(
  owner: string,
  repo: string,
  branch = 'main',
): Promise<{ path: string; type: string }[] | null> {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers: GITHUB_HEADERS, next: { revalidate: 3600 } },
    );

    if (!res.ok) return null;

    const data = await res.json();
    return (data.tree ?? []).map((item: any) => ({
      path: item.path,
      type: item.type, // 'blob' or 'tree'
    }));
  } catch {
    return null;
  }
}

/**
 * Fetch multiple repos in parallel (with rate limit awareness).
 */
export async function fetchMultipleRepos(
  repos: { owner: string; repo: string }[],
): Promise<(GitHubRepo | null)[]> {
  // Batch in groups of 5 to avoid rate limiting
  const results: (GitHubRepo | null)[] = [];
  for (let i = 0; i < repos.length; i += 5) {
    const batch = repos.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map((r) => fetchRepoInfo(r.owner, r.repo)),
    );
    results.push(...batchResults);
    // Small delay between batches
    if (i + 5 < repos.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  return results;
}
