import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('Auth Verify');

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

/**
 * GET /api/auth/verify?token=xxx&type=email
 * Verifies email via Supabase Auth and redirects to login.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const type = request.nextUrl.searchParams.get('type') ?? 'email';

    if (!token) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing verification token');
    }

    // Verify via Supabase Auth
    const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, type }),
    });

    if (!res.ok) {
      const data = await res.json();
      log.error('Verification failed:', data);
      return apiError(
        API_ERROR_CODES.INVALID_REQUEST,
        400,
        data.msg ?? data.error_description ?? 'Verification failed',
      );
    }

    // Redirect to login with success message
    const loginUrl = new URL('/auth/login', request.nextUrl.origin);
    loginUrl.searchParams.set('verified', 'true');
    return Response.redirect(loginUrl.toString(), 302);
  } catch (error) {
    log.error('Verification error:', error);
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Verification failed', String(error));
  }
}
