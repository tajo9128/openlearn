import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { resetPassword } from '@/lib/learning/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('Auth Reset Password');

export async function POST(request: NextRequest) {
  try {
    const { access_token: accessToken, password } = await request.json();

    if (!accessToken || !password) {
      return apiError(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD,
        400,
        'Reset token and new password are required',
      );
    }

    if (password.length < 6) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, 'Password must be at least 6 characters');
    }

    const result = await resetPassword(accessToken, password);

    if (!result.success) {
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 400, result.error ?? 'Reset failed');
    }

    return apiSuccess({ message: result.message });
  } catch (error) {
    log.error('Reset-password failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to reset password',
      error instanceof Error ? error.message : String(error),
    );
  }
}
