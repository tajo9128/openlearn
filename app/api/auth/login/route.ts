import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { signIn, setAuthCookie } from '@/lib/learning/auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('Auth Login');

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Email and password are required');
    }

    const result = await signIn(email, password);

    if (!result.success) {
      return apiError(API_ERROR_CODES.INVALID_CREDENTIALS, 401, result.error ?? 'Invalid credentials');
    }

    // Set JWT cookie
    if (result.accessToken) {
      await setAuthCookie(result.accessToken);
    }

    return apiSuccess({
      user: result.user,
      message: 'Logged in successfully',
    });
  } catch (error) {
    log.error('Login failed:', error);
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Login failed', String(error));
  }
}
