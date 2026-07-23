import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { addCourseToCohort, removeCourseFromCohort } from '@/lib/learning/cohorts';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { course_id } = await request.json();
    if (!course_id) return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing course_id');

    const result = await addCourseToCohort(id, course_id);
    return apiSuccess({ result }, 201);
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to add course', String(error));
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const courseId = request.nextUrl.searchParams.get('course_id');
    if (!courseId) return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing course_id');

    await removeCourseFromCohort(id, courseId);
    return apiSuccess({ removed: true });
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to remove course', String(error));
  }
}
