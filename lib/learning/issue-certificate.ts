/**
 * Shared certificate issuance — used by the certificates API (manual claim)
 * and the progress API (auto-issue at 100% completion).
 */
import { randomUUID } from 'crypto';
import { supabaseQuery, supabaseQuerySingle, supabaseInsert, TABLES } from '@/lib/learning/supabase-client';
import { evaluateCertificateEligibility, generateCertificateNumber } from '@/lib/learning/progression';
import { createLogger } from '@/lib/logger';

const log = createLogger('Certificate Issuer');

export interface IssuedCertificate {
  certificate: any;
  alreadyIssued: boolean;
}

/**
 * Look up a user's display name and email from local_users (registered users).
 * Returns nulls for anonymous users.
 */
export async function lookupUser(userId: string): Promise<{ name: string | null; email: string | null }> {
  try {
    const { data } = await supabaseQuerySingle('local_users' as any, {
      filters: { id: `eq.${userId}` },
    } as any);
    if (data) {
      return { name: (data as any).display_name ?? null, email: (data as any).email ?? null };
    }
  } catch {
    // Anonymous user (localStorage UUID) — no local_users row
  }
  return { name: null, email: null };
}

/**
 * Issue a certificate for a user+course if eligible.
 * Idempotent: returns the existing certificate if already issued.
 */
export async function issueCertificateIfEligible(
  userId: string,
  courseId: string,
  studentNameOverride?: string,
): Promise<IssuedCertificate | null> {
  // Already issued?
  const { data: existing } = await supabaseQuerySingle(TABLES.CERTIFICATES, {
    filters: { user_id: `eq.${userId}`, course_id: `eq.${courseId}` },
  });
  if (existing) {
    return { certificate: existing, alreadyIssued: true };
  }

  // Count completed lessons
  const { data: progress } = await supabaseQuery(TABLES.PROGRESS, {
    filters: { user_id: `eq.${userId}`, course_id: `eq.${courseId}` },
  });
  const lessonsCompleted = (progress ?? []).filter((p: any) => p.status === 'completed').length;

  // Count total lessons (by module OR directly by course for ungrouped lessons)
  const { data: modules } = await supabaseQuery(TABLES.MODULES, {
    filters: { course_id: `eq.${courseId}` },
  });
  const moduleIds = (modules ?? []).map((m: any) => m.id);
  let totalLessons = 0;
  if (moduleIds.length > 0) {
    const { data: lessons } = await supabaseQuery(TABLES.LESSONS, {
      filters: { module_id: `in.(${moduleIds.join(',')})` },
    });
    totalLessons = lessons?.length ?? 0;
  }
  // Include lessons with no module (course-level lessons)
  const { data: courseLessons } = await supabaseQuery(TABLES.LESSONS, {
    filters: { course_id: `eq.${courseId}`, module_id: 'is.null' },
  });
  totalLessons += courseLessons?.length ?? 0;

  if (totalLessons === 0) return null;

  // Exercise eligibility (optional — pass if none exist)
  const { data: exercises } = await supabaseQuery(TABLES.EXERCISES, {
    filters: { course_id: `eq.${courseId}` },
  });
  let exercisesPassed = 0;
  const totalExercises = exercises?.length ?? 0;
  if (totalExercises > 0) {
    for (const exercise of exercises ?? []) {
      const { data: submissions } = await supabaseQuery(TABLES.EXERCISE_SUBMISSIONS, {
        filters: { user_id: `eq.${userId}`, exercise_id: `eq.${exercise.id}` },
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

  const eligibility = evaluateCertificateEligibility({
    lessonsCompleted,
    totalLessons,
    exercisesPassed,
    totalExercises,
  });

  if (!eligibility.eligible) {
    log.info(`Not eligible yet: ${lessonsCompleted}/${totalLessons} lessons — ${eligibility.reason}`);
    return null;
  }

  // Look up student name
  const user = await lookupUser(userId);
  const studentName = studentNameOverride ?? user.name ?? 'BioDockify Student';

  const certId = randomUUID();
  const certNumber = generateCertificateNumber();

  const { data, error } = await supabaseInsert(TABLES.CERTIFICATES, {
    id: certId,
    user_id: userId,
    course_id: courseId,
    certificate_number: certNumber,
    template: 'default',
    metadata: {
      student_name: studentName,
      lessons_completed: lessonsCompleted,
      total_lessons: totalLessons,
      exercises_passed: exercisesPassed,
      total_exercises: totalExercises,
    },
  });

  if (error) {
    log.error('Auto certificate insert failed:', error);
    return null;
  }

  log.info(`Certificate ${certNumber} issued for ${studentName}`);
  return { certificate: data, alreadyIssued: false, userEmail: user.email, studentName } as IssuedCertificate;
}
