import { type NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseQuery, supabaseQuerySingle, supabaseInsert, TABLES } from '@/lib/learning/supabase-client';
import { scoreSubmissionAnswers, calculateTotalScore, determineGradingState } from '@/lib/learning/question-scoring';
import type { AnswerData } from '@/lib/learning/answer-data';
import type { ScorableQuestion } from '@/lib/learning/question-scoring';
import { createLogger } from '@/lib/logger';

const log = createLogger('Learning Exercise Submit API');

/**
 * POST /api/learning/exercises/[id]/submit
 * Submit exercise answers with auto-grading (adapted from ClassroomIO's createSubmissionService)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: exerciseId } = await params;
    const { user_id, answers } = await request.json();

    if (!user_id || !answers) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id or answers');
    }

    // Fetch questions for this exercise
    const { data: questions, error: qErr } = await supabaseQuery(TABLES.EXERCISE_QUESTIONS, {
      filters: { exercise_id: `eq.${exerciseId}` },
      order: { column: 'sort_order', ascending: true },
    });

    if (qErr) {
      log.error('Failed to fetch questions:', qErr);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to fetch questions', qErr);
    }

    if (!questions || questions.length === 0) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 404, 'No questions found for this exercise');
    }

    // Build scorable questions from DB records
    const scorableQuestions: ScorableQuestion[] = questions.map((q: any) => ({
      id: q.id,
      questionType: q.question_type ?? 'RADIO',
      points: q.points ?? 1,
      options: Array.isArray(q.options)
        ? q.options.map((opt: any, idx: number) => ({
            id: opt.id ?? idx,
            label: opt.label ?? opt,
            isCorrect: opt.is_correct ?? opt === q.correct_answer,
            value: opt.value ?? opt.label ?? String(opt),
          }))
        : [],
    }));

    // Auto-grade using ClassroomIO's scoring engine
    const scores = scoreSubmissionAnswers(scorableQuestions, answers as Record<string | number, AnswerData>);
    const { total, maxTotal, percentage } = calculateTotalScore(scores);
    const gradingState = determineGradingState(scores);

    // Build feedback
    const feedbackParts: string[] = [];
    for (const score of scores) {
      if (!score.isCorrect && score.autoGradable) {
        const question = questions.find((q: any) => q.id === score.questionId);
        if (question?.explanation) {
          feedbackParts.push(`${question.title ?? 'Question'}: ${question.explanation}`);
        }
      }
    }

    // Save submission
    const submissionId = randomUUID();
    const { data: submission, error: sErr } = await supabaseInsert(TABLES.EXERCISE_SUBMISSIONS, {
      id: submissionId,
      user_id,
      exercise_id: exerciseId,
      answers,
      score: total,
      max_score: maxTotal,
      graded_at: new Date().toISOString(),
      feedback: feedbackParts.length > 0 ? feedbackParts.join('\n') : (percentage === 100 ? 'Perfect score!' : `${total}/${maxTotal} correct`),
    });

    if (sErr) {
      log.error('Failed to save submission:', sErr);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to save submission', sErr);
    }

    return apiSuccess({
      submission,
      score: total,
      maxScore: maxTotal,
      percentage,
      gradingState,
      scores,
      feedback: feedbackParts,
    });
  } catch (error) {
    log.error('Exercise submission failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to submit exercise',
      error instanceof Error ? error.message : String(error),
    );
  }
}
