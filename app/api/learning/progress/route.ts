import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseQuery, supabaseQuerySingle, supabaseUpsert, TABLES } from '@/lib/learning/supabase-client';
import { issueCertificateIfEligible, lookupUser } from '@/lib/learning/issue-certificate';
import { createLogger } from '@/lib/logger';

const log = createLogger('Learning Progress API');

/**
 * POST /api/learning/progress
 * Update lesson progress (upsert = create or update).
 * Completed lessons are never downgraded to in_progress.
 * When a course reaches 100%, a certificate is auto-issued and a
 * congratulations email is sent (registered users).
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id, lesson_id, course_id, status, score, time_spent_seconds } = await request.json();

    if (!user_id || !lesson_id || !course_id) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id, lesson_id, or course_id');
    }

    const incoming = status ?? 'in_progress';

    // Guard: never downgrade a completed lesson back to in_progress
    let effectiveStatus = incoming;
    const { data: existing } = await supabaseQuerySingle(TABLES.PROGRESS, {
      filters: { user_id: `eq.${user_id}`, lesson_id: `eq.${lesson_id}` },
    });
    if (existing && (existing as any).status === 'completed' && incoming === 'in_progress') {
      effectiveStatus = 'completed'; // keep the achievement
    }

    const row: Record<string, unknown> = {
      user_id,
      lesson_id,
      course_id,
      status: effectiveStatus,
    };

    if (score !== undefined) row.score = score;
    if (time_spent_seconds) row.time_spent_seconds = time_spent_seconds;
    if (effectiveStatus === 'in_progress' && !existing) row.started_at = new Date().toISOString();
    if (effectiveStatus === 'completed' && !(existing as any)?.completed_at) {
      row.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabaseUpsert(TABLES.PROGRESS, row, 'user_id,lesson_id');

    if (error) {
      log.error('Failed to update progress:', error);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to update progress', error);
    }

    // Auto-certificate check on completion
    let certificateIssued = false;
    if (effectiveStatus === 'completed') {
      try {
        const result = await issueCertificateIfEligible(user_id, course_id);
        if (result && !result.alreadyIssued) {
          certificateIssued = true;

          // Send congratulations email for registered users
          const cert = result.certificate as any;
          const user = await lookupUser(user_id);
          if (user.email) {
            const { data: course } = await supabaseQuerySingle(TABLES.COURSES, {
              filters: { id: `eq.${course_id}` },
            });
            const { sendEmail } = await import('@/lib/learning/email');
            const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://learn.biodockify.com';
            await sendEmail('courseCompletion', {
              to: user.email,
              fields: {
                studentName: user.name ?? 'Student',
                courseName: (course as any)?.title ?? 'your course',
                certificateUrl: `${origin}/certificates/${cert.id}`,
              },
            });
            log.info(`Completion email sent to ${user.email}`);
          }
        }
      } catch (certErr) {
        // Certificate/email failure must not break progress recording
        log.warn('Auto-certificate check failed:', certErr);
      }
    }

    return apiSuccess({ progress: data, certificate_issued: certificateIssued });
  } catch (error) {
    log.error('Progress update failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to update progress',
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * GET /api/learning/progress?user_id=xxx&course_id=yyy
 * Get user's progress for a course
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id');
    const courseId = request.nextUrl.searchParams.get('course_id');

    if (!userId) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id parameter');
    }

    const filters: Record<string, string> = { user_id: `eq.${userId}` };
    if (courseId) filters.course_id = `eq.${courseId}`;

    const { data, error } = await supabaseQuery(TABLES.PROGRESS, { filters });

    if (error) {
      log.error('Failed to fetch progress:', error);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to fetch progress', error);
    }

    const progress = data ?? [];
    const completed = progress.filter((p: any) => p.status === 'completed').length;

    return apiSuccess({ progress, completed, total: progress.length });
  } catch (error) {
    log.error('Progress listing failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to fetch progress',
      error instanceof Error ? error.message : String(error),
    );
  }
}
