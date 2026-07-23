/**
 * Compliance Engine — adapted from ClassroomIO
 * Source: /opt/classroomio/apps/api/src/services/course/compliance.ts
 *
 * Lifecycle: not_started → in_progress → compliant → expiring_soon → in_grace_period → non_compliant
 * Cron: expiry check (create next cycle) + reminder scan (status transitions + emails)
 */

import {
  supabaseQuery,
  supabaseQuerySingle,
  supabaseInsert,
  supabaseUpsert,
  TABLES,
} from './supabase-client';
import { evaluateCertificateEligibility } from './progression';

export type ComplianceStatus =
  | 'not_started'
  | 'in_progress'
  | 'compliant'
  | 'expiring_soon'
  | 'in_grace_period'
  | 'non_compliant'
  | 'waived';

export interface ComplianceConfig {
  retakeIntervalMonths: number;
  gracePeriodDays?: number;
  reminderDaysBefore?: number[];
  isMandatory?: boolean;
  framework?: 'GMP' | 'GDPR' | 'HIPAA' | 'OSHA' | 'ISO' | 'CUSTOM' | null;
  maxRetakeAttempts?: number | null;
  passingScore?: number;
}

// ==================== Helpers ====================

function addMonths(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

function getWholeDaysUntil(startDate: Date, endDate: Date): number {
  const ms = endDate.getTime() - startDate.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function getReminderEventType(daysUntilDue: number): string {
  return `reminder_${daysUntilDue}d`;
}

// ==================== Core: Sync compliance progress after submission ====================

export async function syncComplianceProgressFromSubmission(
  courseId: string,
  userId: string,
): Promise<{ status: string; completed: boolean; validUntil?: string } | null> {
  // Fetch course to check if it's a compliance course
  const { data: course } = await supabaseQuerySingle<any>(TABLES.COURSES, {
    filters: { id: `eq.${courseId}` },
  });

  if (!course?.compliance) return null;

  const compliance = course.compliance as ComplianceConfig;

  // Ensure compliance record exists
  let activeRecord = await ensureComplianceRecord(courseId, userId, compliance);

  // Mark as in_progress if was not_started
  if (activeRecord.status === 'not_started') {
    const { data: updated } = await supabaseUpsert<any>(
      TABLES.COMPLIANCE_RECORDS,
      {
        id: activeRecord.id,
        course_id: courseId,
        user_id: userId,
        cycle_number: activeRecord.cycle_number,
        status: 'in_progress',
        started_at: activeRecord.started_at ?? new Date().toISOString(),
        due_date: activeRecord.due_date,
      },
      'id',
    );
    activeRecord = updated ?? activeRecord;
  }

  // Check completion: count lessons + exercises
  const { data: progress } = await supabaseQuery<any>(TABLES.PROGRESS, {
    filters: { user_id: `eq.${userId}`, course_id: `eq.${courseId}` },
  });

  // Count total lessons
  const { data: modules } = await supabaseQuery<any>(TABLES.MODULES, {
    filters: { course_id: `eq.${courseId}` },
  });
  const moduleIds = (modules ?? []).map((m: any) => m.id);
  let totalLessons = 0;
  if (moduleIds.length > 0) {
    const { data: lessons } = await supabaseQuery<any>(TABLES.LESSONS, {
      filters: { module_id: `in.(${moduleIds.join(',')})` },
    });
    totalLessons = lessons?.length ?? 0;
  }
  const lessonsCompleted = (progress ?? []).filter((p: any) => p.status === 'completed').length;

  // Check exercise scores
  const { data: exercises } = await supabaseQuery<any>(TABLES.EXERCISES, {
    filters: { course_id: `eq.${courseId}` },
  });
  let exercisesPassed = 0;
  const totalExercises = exercises?.length ?? 0;

  if (totalExercises > 0) {
    for (const exercise of exercises ?? []) {
      const { data: subs } = await supabaseQuery<any>(TABLES.EXERCISE_SUBMISSIONS, {
        filters: { user_id: `eq.${userId}`, exercise_id: `eq.${exercise.id}` },
        order: { column: 'submitted_at', ascending: false },
        limit: 1,
      });
      if (subs?.length > 0) {
        const pct = subs[0].max_score > 0 ? (subs[0].score / subs[0].max_score) * 100 : 0;
        if (pct >= (compliance.passingScore ?? 60)) exercisesPassed++;
      }
    }
  }

  const eligibility = evaluateCertificateEligibility({
    lessonsCompleted,
    totalLessons,
    exercisesPassed,
    totalExercises,
    passThreshold: compliance.passingScore,
  });

  if (!eligibility.eligible) {
    return { status: 'in_progress', completed: false };
  }

  // Eligible: mark compliant + compute validUntil
  if (activeRecord.completed_at) {
    return { status: activeRecord.status, completed: true };
  }

  const completedAt = new Date().toISOString();
  const validUntil = addMonths(completedAt, compliance.retakeIntervalMonths ?? 12);

  await supabaseUpsert(
    TABLES.COMPLIANCE_RECORDS,
    {
      id: activeRecord.id,
      course_id: courseId,
      user_id: userId,
      cycle_number: activeRecord.cycle_number,
      status: 'compliant',
      started_at: activeRecord.started_at ?? completedAt,
      completed_at: completedAt,
      valid_until: validUntil,
      due_date: activeRecord.due_date,
    },
    'id',
  );

  // Issue certificate for this cycle
  await supabaseInsert(TABLES.CERTIFICATE_ISSUES, {
    course_id: courseId,
    user_id: userId,
    compliance_record_id: activeRecord.id,
    cycle_number: activeRecord.cycle_number,
    expires_at: validUntil,
    status: 'valid',
  });

  return { status: 'compliant', completed: true, validUntil };
}

async function ensureComplianceRecord(
  courseId: string,
  userId: string,
  compliance: ComplianceConfig,
): Promise<any> {
  // Get latest record
  const { data: existing } = await supabaseQuery<any>(TABLES.COMPLIANCE_RECORDS, {
    filters: { course_id: `eq.${courseId}`, user_id: `eq.${userId}` },
    order: { column: 'cycle_number', ascending: false },
    limit: 1,
  });

  if (existing && existing.length > 0) {
    return existing[0];
  }

  // Create cycle 1 record
  const dueDate = addMonths(new Date().toISOString(), compliance.retakeIntervalMonths ?? 12);
  const { data, error } = await supabaseInsert<any>(TABLES.COMPLIANCE_RECORDS, {
    course_id: courseId,
    user_id: userId,
    cycle_number: 1,
    status: 'not_started',
    due_date: dueDate,
  });

  if (error) throw new Error(`Failed to create compliance record: ${error}`);
  return data;
}

// ==================== Cron: Expiry Check ====================

export async function runComplianceExpiryCheck(): Promise<{
  processedCount: number;
  createdCycleCount: number;
  skippedCount: number;
}> {
  const nowIso = new Date().toISOString();

  // Find records where valid_until has passed but not yet expired
  const { data: records, error } = await supabaseQuery<any>(TABLES.COMPLIANCE_RECORDS, {
    filters: {
      valid_until: `lt.${nowIso}`,
      expired_at: 'is.null',
      status: 'in.(compliant,expiring_soon,in_grace_period)',
    },
  });

  if (error || !records) {
    return { processedCount: 0, createdCycleCount: 0, skippedCount: 0 };
  }

  let processedCount = 0;
  let createdCycleCount = 0;
  let skippedCount = 0;

  for (const record of records) {
    if (!record.valid_until) {
      skippedCount++;
      continue;
    }

    // Mark as expired
    await supabaseUpsert(
      TABLES.COMPLIANCE_RECORDS,
      { ...record, expired_at: nowIso },
      'id',
    );

    // Expire certificate
    const { data: certs } = await supabaseQuery<any>(TABLES.CERTIFICATE_ISSUES, {
      filters: { compliance_record_id: `eq.${record.id}` },
    });
    if (certs?.length > 0) {
      await supabaseUpsert(
        TABLES.CERTIFICATE_ISSUES,
        { ...certs[0], status: 'expired' },
        'id',
      );
    }

    // Create next cycle
    const nextDueDate = record.valid_until;
    const { data: created, error: createErr } = await supabaseInsert<any>(
      TABLES.COMPLIANCE_RECORDS,
      {
        course_id: record.course_id,
        user_id: record.user_id,
        cycle_number: record.cycle_number + 1,
        status: 'not_started',
        due_date: nextDueDate,
      },
    );

    processedCount++;
    if (!createErr) createdCycleCount++;
    else skippedCount++;
  }

  return { processedCount, createdCycleCount, skippedCount };
}

// ==================== Cron: Reminder Scan ====================

export async function runComplianceReminderScan(): Promise<{
  scannedCount: number;
  statusUpdatedCount: number;
  reminderEventCount: number;
}> {
  const now = new Date();
  const { data: rows, error } = await supabaseQuery<any>(TABLES.COMPLIANCE_RECORDS, {
    filters: { status: 'in.(compliant,expiring_soon,in_grace_period,not_started,in_progress)' },
  });

  if (error || !rows) {
    return { scannedCount: 0, statusUpdatedCount: 0, reminderEventCount: 0 };
  }

  let scannedCount = 0;
  let statusUpdatedCount = 0;
  let reminderEventCount = 0;

  for (const record of rows) {
    scannedCount++;

    // Fetch course compliance config
    const { data: course } = await supabaseQuerySingle<any>(TABLES.COURSES, {
      filters: { id: `eq.${record.course_id}` },
      select: 'compliance',
    });

    const compliance = course?.compliance as ComplianceConfig | null;
    if (!compliance) continue;
    if (record.status === 'waived') continue;

    const dueDate = new Date(record.due_date);
    if (isNaN(dueDate.getTime())) continue;

    const daysUntilDue = getWholeDaysUntil(now, dueDate);
    const gracePeriodDays = compliance.gracePeriodDays ?? 0;
    let nextStatus: ComplianceStatus | null = null;

    if (daysUntilDue < 0) {
      // Past due
      const graceEnd = new Date(dueDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);
      nextStatus = gracePeriodDays > 0 && now <= graceEnd ? 'in_grace_period' : 'non_compliant';
    } else if ((compliance.reminderDaysBefore ?? [7, 1]).includes(daysUntilDue)) {
      nextStatus = 'expiring_soon';

      // Create reminder notification (dedup by event_type)
      const eventType = getReminderEventType(daysUntilDue);
      const { data: existing } = await supabaseQuerySingle<any>(TABLES.COMPLIANCE_NOTIFICATIONS, {
        filters: {
          compliance_record_id: `eq.${record.id}`,
          event_type: `eq.${eventType}`,
        },
      });
      if (!existing) {
        await supabaseInsert(TABLES.COMPLIANCE_NOTIFICATIONS, {
          compliance_record_id: record.id,
          channel: 'email',
          event_type: eventType,
        });
        reminderEventCount++;
      }
    }

    if (nextStatus && record.status !== nextStatus) {
      await supabaseUpsert(
        TABLES.COMPLIANCE_RECORDS,
        { ...record, status: nextStatus },
        'id',
      );
      statusUpdatedCount++;
    }
  }

  return { scannedCount, statusUpdatedCount, reminderEventCount };
}

// ==================== Compliance Overview (audit dashboard) ====================

export async function getCourseComplianceOverview(courseId: string): Promise<{
  courseId: string;
  summary: Record<string, number>;
  learners: any[];
}> {
  const { data: records } = await supabaseQuery<any>(TABLES.COMPLIANCE_RECORDS, {
    filters: { course_id: `eq.${courseId}` },
  });

  const counts: Record<string, number> = {
    total: records?.length ?? 0,
    not_started: 0,
    in_progress: 0,
    compliant: 0,
    expiring_soon: 0,
    in_grace_period: 0,
    non_compliant: 0,
    waived: 0,
  };

  for (const r of records ?? []) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }

  return {
    courseId,
    summary: counts,
    learners: records ?? [],
  };
}

// ==================== Admin Operations ====================

export async function resetCourseCompliance(
  courseId: string,
  userIds: string[],
  dueDate: string,
): Promise<{ updated: number }> {
  let updated = 0;
  for (const userId of userIds) {
    const { data: records } = await supabaseQuery<any>(TABLES.COMPLIANCE_RECORDS, {
      filters: { course_id: `eq.${courseId}`, user_id: `eq.${userId}` },
      order: { column: 'cycle_number', ascending: false },
      limit: 1,
    });

    if (records?.length > 0) {
      await supabaseUpsert(
        TABLES.COMPLIANCE_RECORDS,
        {
          ...records[0],
          status: 'not_started',
          due_date: dueDate,
          started_at: null,
          completed_at: null,
          valid_until: null,
          expired_at: null,
          score: null,
          attempts: 0,
          waived_by: null,
          waiver_reason: null,
        },
        'id',
      );
      updated++;
    }
  }
  return { updated };
}

export async function waiveCourseCompliance(
  courseId: string,
  userIds: string[],
  waivedBy: string,
  waiverReason?: string,
  waiverExpiresAt?: string,
): Promise<{ updated: number }> {
  let updated = 0;
  for (const userId of userIds) {
    const { data: records } = await supabaseQuery<any>(TABLES.COMPLIANCE_RECORDS, {
      filters: { course_id: `eq.${courseId}`, user_id: `eq.${userId}` },
      order: { column: 'cycle_number', ascending: false },
      limit: 1,
    });

    if (records?.length > 0) {
      await supabaseUpsert(
        TABLES.COMPLIANCE_RECORDS,
        {
          ...records[0],
          status: 'waived',
          waived_by: waivedBy,
          waiver_reason: waiverReason ?? null,
          waiver_expires_at: waiverExpiresAt ?? null,
        },
        'id',
      );
      updated++;
    }
  }
  return { updated };
}
