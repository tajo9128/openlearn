import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { getCurrentUser } from '@/lib/learning/auth';

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError(API_ERROR_CODES.INVALID_CREDENTIALS, 401, 'Not authenticated');
    }

    return apiSuccess({ user });
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to get user', String(error));
  }
}
