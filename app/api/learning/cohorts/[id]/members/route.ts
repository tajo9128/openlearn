import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { addCohortMember, removeCohortMember } from '@/lib/learning/cohorts';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user_id, role, email } = await request.json();
    if (!user_id) return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id');

    const member = await addCohortMember(id, user_id, role ?? 'student', email);
    return apiSuccess({ member }, 201);
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to add member', String(error));
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const memberId = request.nextUrl.searchParams.get('member_id');
    if (!memberId) return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing member_id');

    await removeCohortMember(memberId);
    return apiSuccess({ removed: true });
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to remove member', String(error));
  }
}
