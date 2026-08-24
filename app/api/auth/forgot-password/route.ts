import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { requestPasswordReset } from '@/lib/learning/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('Auth Forgot Password');

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Email is required');
    }

    const result = await requestPasswordReset(email);

    if (!result.success) {
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, result.error ?? 'Request failed');
    }

    return apiSuccess({ message: result.message });
  } catch (error) {
    log.error('Forgot-password failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to request reset',
      error instanceof Error ? error.message : String(error),
    );
  }
}
