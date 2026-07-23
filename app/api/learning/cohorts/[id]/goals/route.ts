import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { createGoal, listGoals, getCohortGoalSummary } from '@/lib/learning/cohort-goals';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const summary = request.nextUrl.searchParams.get('summary') === 'true';
    const goals = summary ? await getCohortGoalSummary(id) : await listGoals(id);
    return apiSuccess({ goals });
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to list goals', String(error));
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { created_by, ...goalData } = body;
    if (!created_by) return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing created_by');
    if (!goalData.title) return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing title');
    if (!goalData.type) return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing type');

    const goal = await createGoal(id, goalData, created_by);
    return apiSuccess({ goal }, 201);
  } catch (error) {
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Failed to create goal', String(error));
  }
}
