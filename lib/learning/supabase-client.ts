/**
 * Supabase REST client for BioDockify Learn
 *
 * Uses native fetch — no npm dependency required.
 * Environment variables are read server-side only (no NEXT_PUBLIC prefix).
 *
 * Add to .env.local:
 *   SUPABASE_URL=https://<project>.supabase.co
 *   SUPABASE_ANON_KEY=<anon-key>
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ?? '';

const baseHeaders: Record<string, string> = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// ==================== Query Builder ====================

interface QueryOpts {
  select?: string;
  filters?: Record<string, string>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

function buildUrl(table: string, opts: QueryOpts = {}): string {
  const params = new URLSearchParams();
  params.set('select', opts.select ?? '*');
  for (const [k, v] of Object.entries(opts.filters ?? {})) {
    params.set(k, v);
  }
  if (opts.order) {
    params.set('order', `${opts.order.column}.${opts.order.ascending === false ? 'desc' : 'asc'}`);
  }
  if (opts.limit !== undefined) params.set('limit', String(opts.limit));
  if (opts.offset !== undefined) params.set('offset', String(opts.offset));
  return `${SUPABASE_URL}/rest/v1/${table}?${params}`;
}

// ==================== Core Operations ====================

export interface SupabaseResult<T> {
  data: T | null;
  error: string | null;
}

export async function supabaseQuery<T = any>(
  table: string,
  opts: QueryOpts = {},
): Promise<SupabaseResult<T[]>> {
  try {
    const url = buildUrl(table, opts);
    const res = await fetch(url, { headers: baseHeaders });
    if (!res.ok) {
      const body = await res.text();
      return { data: null, error: `Supabase ${res.status}: ${body}` };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

export async function supabaseQuerySingle<T = any>(
  table: string,
  opts: QueryOpts = {},
): Promise<SupabaseResult<T>> {
  const result = await supabaseQuery<T>(table, opts);
  if (result.error) return { data: null, error: result.error };
  return { data: result.data?.[0] ?? null, error: null };
}

export async function supabaseInsert<T = any>(
  table: string,
  row: Record<string, unknown>,
): Promise<SupabaseResult<T>> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...baseHeaders, Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const body = await res.text();
      return { data: null, error: `Supabase ${res.status}: ${body}` };
    }
    const data = await res.json();
    return { data: Array.isArray(data) ? data[0] : data, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

export async function supabaseUpsert<T = any>(
  table: string,
  row: Record<string, unknown>,
  onConflict: string,
): Promise<SupabaseResult<T>> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...baseHeaders,
        Prefer: 'return=representation,resolution=merge-duplicates',
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const body = await res.text();
      return { data: null, error: `Supabase ${res.status}: ${body}` };
    }
    const data = await res.json();
    return { data: Array.isArray(data) ? data[0] : data, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

// ==================== Table Names ====================

export const TABLES = {
  COURSES: 'learning_courses',
  MODULES: 'learning_modules',
  LESSONS: 'learning_lessons',
  EXERCISES: 'learning_exercises',
  EXERCISE_QUESTIONS: 'learning_exercise_questions',
  ENROLLMENTS: 'learning_enrollments',
  PROGRESS: 'learning_progress',
  EXERCISE_SUBMISSIONS: 'learning_exercise_submissions',
  CERTIFICATES: 'learning_certificates',
  // Compliance
  COMPLIANCE_RECORDS: 'learning_compliance_records',
  CERTIFICATE_ISSUES: 'learning_certificate_issues',
  COMPLIANCE_NOTIFICATIONS: 'learning_compliance_notifications',
  // Cohorts
  COHORTS: 'learning_cohorts',
  COHORT_MEMBERS: 'learning_cohort_members',
  COHORT_COURSES: 'learning_cohort_courses',
  COHORT_GOALS: 'learning_cohort_goals',
  GOAL_ASSIGNMENTS: 'learning_cohort_goal_assignments',
  // Newsfeed
  NEWSFEED: 'learning_newsfeed',
  NEWSFEED_COMMENTS: 'learning_newsfeed_comments',
} as const;
