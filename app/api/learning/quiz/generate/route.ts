import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { generateQuiz } from '@/lib/learning/quiz-generator';
import { createLogger } from '@/lib/logger';

const log = createLogger('Quiz Generate API');

/**
 * POST /api/learning/quiz/generate
 * Auto-generate quiz questions from course content
 */
export async function POST(request: NextRequest) {
  try {
    const { topic, content, num_questions, question_types, difficulty } = await request.json();

    if (!topic || !content) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing topic or content');
    }

    const modelOpts = {
      modelString: request.headers.get('x-model') ?? undefined,
      apiKey: request.headers.get('x-api-key') ?? undefined,
      baseUrl: request.headers.get('x-base-url') ?? undefined,
      providerType: request.headers.get('x-provider-type') ?? undefined,
    };

    const questions = await generateQuiz({
      topic,
      content,
      numQuestions: num_questions ?? 5,
      questionTypes: question_types,
      difficulty,
      modelOpts,
    });

    return apiSuccess({ questions });
  } catch (error) {
    log.error('Quiz generation failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to generate quiz',
      error instanceof Error ? error.message : String(error),
    );
  }
}
