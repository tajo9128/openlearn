import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { signUp, setAuthCookie } from '@/lib/learning/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('Auth Signup');

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Name, email, and password are required');
    }

    if (password.length < 6) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, 'Password must be at least 6 characters');
    }

    const result = await signUp(name, email, password);

    if (!result.success) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, result.error ?? 'Signup failed');
    }

    // If email confirmation is not required, set the cookie immediately
    if (result.accessToken) {
      await setAuthCookie(result.accessToken);
    }

    return apiSuccess({
      user: result.user,
      message: result.accessToken
        ? 'Account created successfully'
        : 'Account created. Please check your email to verify your account.',
      needsVerification: !result.accessToken,
    }, 201);
  } catch (error) {
    log.error('Signup failed:', error);
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Signup failed', String(error));
  }
}
