import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { createCohort, listCohorts } from '@/lib/learning/cohorts';
import { createLogger } from '@/lib/logger';

const log = createLogger('Cohorts API');

export async function GET(request: NextRequest) {
  try {
    const activeOnly = request.nextUrl.searchParams.get('all') !== 'true';
    const cohorts = await listCohorts(activeOnly);
    return apiSuccess({ cohorts });
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to list cohorts', String(error));
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description, created_by } = await request.json();
    if (!name) return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing name');
    if (!created_by) return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing created_by');

    const cohort = await createCohort(name, created_by, description);
    return apiSuccess({ cohort }, 201);
  } catch (error) {
    log.error('Cohort creation failed:', error);
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to create cohort', String(error));
  }
}
