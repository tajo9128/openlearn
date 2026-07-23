import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { signOut, getAuthCookie, clearAuthCookie } from '@/lib/learning/auth';

export async function POST(_request: NextRequest) {
  try {
    const token = await getAuthCookie();
    if (token) {
      await signOut(token);
    }
    await clearAuthCookie();
    return apiSuccess({ message: 'Logged out successfully' });
  } catch (error) {
    // Clear cookie even if Supabase logout fails
    await clearAuthCookie();
    return apiSuccess({ message: 'Logged out' });
  }
}
