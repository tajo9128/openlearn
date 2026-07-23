import { type NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseQuery, supabaseQuerySingle, supabaseInsert, TABLES } from '@/lib/learning/supabase-client';
import { evaluateCertificateEligibility, generateCertificateNumber } from '@/lib/learning/progression';
import { createLogger } from '@/lib/logger';

const log = createLogger('Learning Certificates API');

/**
 * GET /api/learning/certificates?user_id=xxx
 * Get user's certificates
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id');
    if (!userId) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id parameter');
    }

    const { data, error } = await supabaseQuery(TABLES.CERTIFICATES, {
      select: '*, learning_courses(title, category, difficulty)',
      filters: { user_id: `eq.${userId}` },
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
 * Issue certificate after checking eligibility (adapted from ClassroomIO's evaluateCourseCertification)
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id, course_id } = await request.json();

    if (!user_id || !course_id) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing user_id or course_id');
    }

    // Check if certificate already issued
    const { data: existing } = await supabaseQuerySingle(TABLES.CERTIFICATES, {
      filters: { user_id: `eq.${user_id}`, course_id: `eq.${course_id}` },
    });

    if (existing) {
      return apiSuccess({ certificate: existing, message: 'Certificate already issued' });
    }

    // Check lesson completion
    const { data: progress } = await supabaseQuery(TABLES.PROGRESS, {
      filters: { user_id: `eq.${user_id}`, course_id: `eq.${course_id}` },
    });

    // Count total lessons in course
    const { data: modules } = await supabaseQuery(TABLES.MODULES, {
      filters: { course_id: `eq.${course_id}` },
    });

    const moduleIds = (modules ?? []).map((m: any) => m.id);
    let totalLessons = 0;
    if (moduleIds.length > 0) {
      const { data: lessons } = await supabaseQuery(TABLES.LESSONS, {
        filters: { module_id: `in.(${moduleIds.join(',')})` },
      });
      totalLessons = lessons?.length ?? 0;
    }

    const lessonsCompleted = (progress ?? []).filter((p: any) => p.status === 'completed').length;

    // Check exercise completion
    const { data: exercises } = await supabaseQuery(TABLES.EXERCISES, {
      filters: { course_id: `eq.${course_id}` },
    });

    let exercisesPassed = 0;
    const totalExercises = exercises?.length ?? 0;

    if (totalExercises > 0) {
      for (const exercise of exercises ?? []) {
        const { data: submissions } = await supabaseQuery(TABLES.EXERCISE_SUBMISSIONS, {
          filters: { user_id: `eq.${user_id}`, exercise_id: `eq.${exercise.id}` },
          order: { column: 'submitted_at', ascending: false },
          limit: 1,
        });
        if (submissions && submissions.length > 0) {
          const sub = submissions[0];
          const percentage = sub.max_score > 0 ? (sub.score / sub.max_score) * 100 : 0;
          if (percentage >= 60) exercisesPassed++;
        }
      }
    }

    // Evaluate eligibility using ClassroomIO's logic
    const eligibility = evaluateCertificateEligibility({
      lessonsCompleted,
      totalLessons,
      exercisesPassed,
      totalExercises,
    });

    if (!eligibility.eligible) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 400, eligibility.reason ?? 'Course not completed');
    }

    // Issue certificate
    const certId = randomUUID();
    const certNumber = generateCertificateNumber();

    const { data, error } = await supabaseInsert(TABLES.CERTIFICATES, {
      id: certId,
      user_id,
      course_id,
      certificate_number: certNumber,
      template: 'default',
      metadata: {
        lessons_completed: lessonsCompleted,
        total_lessons: totalLessons,
        exercises_passed: exercisesPassed,
        total_exercises: totalExercises,
      },
    });

    if (error) {
      log.error('Failed to issue certificate:', error);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to issue certificate', error);
    }

    return apiSuccess({ certificate: data }, 201);
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
