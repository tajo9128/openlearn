import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseQuery, TABLES } from '@/lib/learning/supabase-client';
import { issueCertificateIfEligible } from '@/lib/learning/issue-certificate';
import { createLogger } from '@/lib/logger';

const log = createLogger('Learning Certificates API');

/**
 * GET /api/learning/certificates?user_id=xxx  |  ?id=<cert-id>
 * Get user's certificates, or a single certificate by id (public verification).
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id');
    const certId = request.nextUrl.searchParams.get('id');

    if (!userId && !certId) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id or id parameter');
    }

    const { data, error } = await supabaseQuery(TABLES.CERTIFICATES, {
      select: '*, learning_courses(title, category, difficulty)',
      filters: certId ? { id: `eq.${certId}` } : { user_id: `eq.${userId}` },
    });

    if (error) {
      log.error('Failed to fetch certificates:', error);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to fetch certificates', error);
    }

    return apiSuccess({ certificates: data ?? [] });
  } catch (error) {
    log.error('Certificate listing failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to fetch certificates',
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * POST /api/learning/certificates
 * Issue certificate after checking eligibility (manual "Claim" flow).
 * The progress API auto-issues at 100%; this remains for explicit claims.
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id, course_id, student_name } = await request.json();

    if (!user_id || !course_id) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id or course_id');
    }

    const result = await issueCertificateIfEligible(user_id, course_id, student_name);

    if (!result) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, 'Course not completed yet');
    }

    if (result.alreadyIssued) {
      return apiSuccess({ certificate: result.certificate, message: 'Certificate already issued' });
    }

    return apiSuccess({ certificate: result.certificate }, 201);
  } catch (error) {
    log.error('Certificate issuance failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to issue certificate',
      error instanceof Error ? error.message : String(error),
    );
  }
}
