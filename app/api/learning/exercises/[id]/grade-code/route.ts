import { type NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseInsert, supabaseQuery, TABLES } from '@/lib/learning/supabase-client';
import { gradeCodeAgainstTests, buildTestFeedback, type CodeTestCase } from '@/lib/learning/code-scoring';
import { createLogger } from '@/lib/logger';

const log = createLogger('Grade Code API');

/**
 * POST /api/learning/exercises/[id]/grade-code
 * Grade a Python code submission against test cases.
 *
 * Body: { user_id, code, stdout, test_cases }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: exerciseId } = await params;
    const { user_id, code, stdout, test_cases } = await request.json();

    if (!user_id || code === undefined) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id or code');
    }

    // If test_cases not provided, fetch from DB
    let testCases: CodeTestCase[] = test_cases;
    if (!testCases || testCases.length === 0) {
      const { data: questions, error } = await supabaseQuery<any>(TABLES.EXERCISE_QUESTIONS, {
        filters: { exercise_id: `eq.${exerciseId}`, question_type: 'eq.code' },
      });

      if (error) {
        return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to fetch test cases', error);
      }

      testCases = [];
      for (const q of questions ?? []) {
        // Test cases stored in options jsonb
        if (Array.isArray(q.options)) {
          testCases.push(...(q.options as CodeTestCase[]));
        }
      }
    }

    // Grade the code
    const result = gradeCodeAgainstTests(stdout ?? '', testCases);
    const feedback = buildTestFeedback(result);

    // Save submission
    const { data: submission, error: sErr } = await supabaseInsert(TABLES.EXERCISE_SUBMISSIONS, {
      id: randomUUID(),
      user_id,
      exercise_id: exerciseId,
      answers: { code, stdout, testResults: result.results },
      score: result.passed,
      max_score: result.total,
      graded_at: new Date().toISOString(),
      feedback,
    });

    if (sErr) {
      log.error('Failed to save code submission:', sErr);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to save submission', sErr);
    }

    return apiSuccess({
      submission,
      score: result.passed,
      maxScore: result.total,
      percentage: result.percentage,
      testResults: result.results,
      feedback,
    });
  } catch (error) {
    log.error('Code grading failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to grade code',
      error instanceof Error ? error.message : String(error),
    );
  }
}
