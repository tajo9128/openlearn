import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { requestPasswordReset } from '@/lib/learning/auth';
import { validateEmailDeliverable } from '@/lib/learning/validate-email';
import { createLogger } from '@/lib/logger';

const log = createLogger('Auth Forgot Password');

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Email is required');
    }

    // Reset mails to dead addresses count as bounces; gate on deliverability.
    const emailCheck = await validateEmailDeliverable(email);
    if (!emailCheck.ok) {
      // Do not reveal whether the address exists; just skip sending.
      return apiSuccess({ message: 'If that email exists, a reset link has been sent.' });
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
