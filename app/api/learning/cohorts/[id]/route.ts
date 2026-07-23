import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { getCohort, updateCohort, deleteCohort, listCohortMembers, listCohortCourses } from '@/lib/learning/cohorts';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cohort = await getCohort(id);
    if (!cohort) return apiError(API_ERROR_CODES.INVALID_REQUEST, 404, 'Cohort not found');

    const [members, courses] = await Promise.all([listCohortMembers(id), listCohortCourses(id)]);
    return apiSuccess({ cohort, members, courses });
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to get cohort', String(error));
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updateCohort(id, body);
    return apiSuccess({ cohort: updated });
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to update cohort', String(error));
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteCohort(id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to delete cohort', String(error));
  }
}
