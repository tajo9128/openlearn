import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { runComplianceExpiryCheck, runComplianceReminderScan } from '@/lib/learning/compliance';
import { runCohortGoalEvaluationSweep, runCohortGoalReminderScan } from '@/lib/learning/cohort-goals';
import { createLogger } from '@/lib/logger';

const log = createLogger('Compliance Cron API');

const CRON_API_KEY = process.env.CRON_API_KEY ?? 'biodockify-cron-2026';

function checkCronAuth(request: NextRequest): boolean {
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${CRON_API_KEY}`;
}

/**
 * POST /api/learning/compliance/cron?action=check-expiry
 * POST /api/learning/compliance/cron?action=send-reminders
 * POST /api/learning/compliance/cron?action=evaluate-goals
 * POST /api/learning/compliance/cron?action=send-goal-reminders
 */
export async function POST(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return apiError(API_ERROR_CODES.INVALID_CREDENTIALS, 401, 'Unauthorized');
  }

  try {
    const action = request.nextUrl.searchParams.get('action');
    let result: unknown;

    switch (action) {
      case 'check-expiry':
        result = await runComplianceExpiryCheck();
        log.info('Expiry check done:', JSON.stringify(result));
        break;
      case 'send-reminders':
        result = await runComplianceReminderScan();
        log.info('Reminder scan done:', JSON.stringify(result));
        break;
      case 'evaluate-goals':
        result = await runCohortGoalEvaluationSweep();
        log.info('Goal evaluation done:', JSON.stringify(result));
        break;
      case 'send-goal-reminders':
        result = await runCohortGoalReminderScan();
        log.info('Goal reminders done:', JSON.stringify(result));
        break;
      default:
        return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, `Unknown action: ${action}`);
    }

    return apiSuccess({ action, result });
  } catch (error) {
    log.error('Cron job failed:', error);
    return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'Cron job failed', String(error));
  }
}
