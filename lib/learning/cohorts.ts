/**
 * Cohorts module — adapted from ClassroomIO
 * Source: /opt/classroomio/apps/api/src/services/cohort/cohort.ts
 *
 * A cohort = a training program (group of courses + roster of learners).
 */

import {
  supabaseQuery,
  supabaseQuerySingle,
  supabaseInsert,
  supabaseUpsert,
  TABLES,
} from './supabase-client';

// ==================== Types ====================

export interface Cohort {
  id: string;
  name: string;
  description?: string;
  cover_image?: string;
  status: 'active' | 'archived';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CohortMember {
  id: string;
  cohort_id: string;
  user_id?: string;
  email?: string;
  role: 'student' | 'instructor' | 'admin';
  created_at: string;
}

// ==================== Cohort CRUD ====================

export async function createCohort(
  name: string,
  createdBy: string,
  description?: string,
): Promise<any> {
  const { data, error } = await supabaseInsert(TABLES.COHORTS, {
    name,
    description: description ?? `Training program: ${name}`,
    created_by: createdBy,
  });
  if (error) throw new Error(`Failed to create cohort: ${error}`);

  // Creator becomes admin member
  await supabaseInsert(TABLES.COHORT_MEMBERS, {
    cohort_id: data.id,
    user_id: createdBy,
    role: 'admin',
  });

  return data;
}

export async function getCohort(cohortId: string): Promise<any | null> {
  const { data } = await supabaseQuerySingle<any>(TABLES.COHORTS, {
    filters: { id: `eq.${cohortId}` },
  });
  return data;
}

export async function listCohorts(activeOnly = true): Promise<any[]> {
  const filters: Record<string, string> = {};
  if (activeOnly) filters.status = 'eq.active';

  const { data } = await supabaseQuery<any>(TABLES.COHORTS, {
    filters,
    order: { column: 'created_at', ascending: false },
  });
  return data ?? [];
}

export async function updateCohort(cohortId: string, updates: Record<string, unknown>): Promise<any> {
  const { data } = await supabaseUpsert<any>(
    TABLES.COHORTS,
    { id: cohortId, ...updates, updated_at: new Date().toISOString() },
    'id',
  );
  return data;
}

export async function deleteCohort(cohortId: string): Promise<void> {
  // Cascade delete handles members, courses, goals
  await supabaseUpsert(TABLES.COHORTS, { id: cohortId, status: 'archived' }, 'id');
}

// ==================== Members ====================

export async function listCohortMembers(cohortId: string): Promise<any[]> {
  const { data } = await supabaseQuery<any>(TABLES.COHORT_MEMBERS, {
    filters: { cohort_id: `eq.${cohortId}` },
    order: { column: 'created_at', ascending: true },
  });
  return data ?? [];
}

export async function addCohortMember(
  cohortId: string,
  userId: string,
  role: 'student' | 'instructor' | 'admin' = 'student',
  email?: string,
): Promise<any> {
  // Check existing
  const { data: existing } = await supabaseQuerySingle<any>(TABLES.COHORT_MEMBERS, {
    filters: { cohort_id: `eq.${cohortId}`, user_id: `eq.${userId}` },
  });

  if (existing) return existing;

  const { data, error } = await supabaseInsert(TABLES.COHORT_MEMBERS, {
    cohort_id: cohortId,
    user_id: userId,
    email,
    role,
  });
  if (error) throw new Error(`Failed to add member: ${error}`);

  // Auto-enroll student in all cohort courses
  if (role === 'student') {
    const courses = await listCohortCourses(cohortId);
    for (const cc of courses) {
      await supabaseInsert(TABLES.ENROLLMENTS, {
        user_id: userId,
        course_id: cc.course_id,
      }).catch(() => {}); // ignore duplicate
    }
  }

  return data;
}

export async function removeCohortMember(memberId: string): Promise<void> {
  // Delete via upsert with a flag — actual delete needs REST API DELETE
  // For simplicity, we mark as removed via direct fetch
  const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ?? '';
  await fetch(`${SUPABASE_URL}/rest/v1/${TABLES.COHORT_MEMBERS}?id=eq.${memberId}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
}

// ==================== Courses ====================

export async function listCohortCourses(cohortId: string): Promise<any[]> {
  const { data } = await supabaseQuery<any>(TABLES.COHORT_COURSES, {
    select: '*, learning_courses(*)',
    filters: { cohort_id: `eq.${cohortId}` },
  });
  return data ?? [];
}

export async function addCourseToCohort(cohortId: string, courseId: string): Promise<any> {
  const { data, error } = await supabaseInsert(TABLES.COHORT_COURSES, {
    cohort_id: cohortId,
    course_id: courseId,
  });
  if (error) throw new Error(`Failed to add course: ${error}`);

  // Enroll all existing student members
  const members = await listCohortMembers(cohortId);
  const students = members.filter((m) => m.role === 'student');
  for (const student of students) {
    await supabaseInsert(TABLES.ENROLLMENTS, {
      user_id: student.user_id,
      course_id: courseId,
    }).catch(() => {});
  }

  return data;
}

export async function removeCourseFromCohort(cohortId: string, courseId: string): Promise<void> {
  const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ?? '';
  await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLES.COHORT_COURSES}?cohort_id=eq.${cohortId}&course_id=eq.${courseId}`,
    { method: 'DELETE', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  );
}
