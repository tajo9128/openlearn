import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseQuerySingle, supabaseUpsert, TABLES } from '@/lib/learning/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('Classroom Generate API');

/**
 * POST /api/learning/classroom/generate
 * Start classroom generation (async — returns jobId immediately).
 */
export async function POST(request: NextRequest) {
  try {
    const { lesson_id, course_id, wait } = await request.json();

    if (!lesson_id || !course_id) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing lesson_id or course_id');
    }

    // Check if classroom already exists
    const { data: lesson } = await supabaseQuerySingle<any>(TABLES.LESSONS, {
      filters: { id: `eq.${lesson_id}` },
    });

    if (!lesson) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 404, 'Lesson not found');
    }

    if (lesson.classroom_id) {
      return apiSuccess({
        classroom_id: lesson.classroom_id,
        url: `/classroom/${lesson.classroom_id}`,
        cached: true,
      });
    }

    // Fetch course + lessons for context
    const { data: course } = await supabaseQuerySingle<any>(TABLES.COURSES, {
      filters: { id: `eq.${course_id}` },
    });

    const { data: modules } = await supabaseQuery<any>(TABLES.MODULES, {
      filters: { course_id: `eq.${course_id}` },
      order: { column: 'sort_order', ascending: true },
    });

    const moduleIds = (modules ?? []).map((m: any) => m.id);
    let allLessons: any[] = [];
    if (moduleIds.length > 0) {
      const { data } = await supabaseQuery<any>(TABLES.LESSONS, {
        filters: { module_id: `in.(${moduleIds.join(',')})` },
        order: { column: 'sort_order', ascending: true },
      });
      allLessons = data ?? [];
    }

    // Build requirement
    const requirement = buildRequirement(lesson, course, allLessons);

    // Start generation job
    const baseUrl = 'http://localhost:3000';
    const genRes = await fetch(`${baseUrl}/api/generate-classroom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirement, agentMode: 'generate' }),
    });

    if (!genRes.ok) {
      const errText = await genRes.text();
      log.error('Generation API failed:', errText);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to start generation', errText);
    }

    const genData = await genRes.json();
    const jobId = genData.jobId;

    // If wait=true, poll until done (up to 15 minutes)
    if (wait) {
      const result = await pollForCompletion(baseUrl, jobId, 180);
      if (result.classroomId) {
        await supabaseUpsert(TABLES.LESSONS, { id: lesson_id, classroom_id: result.classroomId }, 'id');
        return apiSuccess({
          classroom_id: result.classroomId,
          url: `/classroom/${result.classroomId}`,
          cached: false,
        });
      }
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 504, result.error ?? 'Generation timed out');
    }

    // Otherwise return jobId immediately (async mode)
    return apiSuccess({
      job_id: jobId,
      poll_url: `/api/generate-classroom/${jobId}`,
      message: 'Generation started. Poll the poll_url for status.',
    });
  } catch (error) {
    log.error('Classroom generation failed:', error);
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to generate classroom',
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function pollForCompletion(baseUrl: string, jobId: string, maxPolls: number) {
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const res = await fetch(`${baseUrl}/api/generate-classroom/${jobId}`);
      const data = await res.json();

      if (data.status === 'succeeded' && (data.result?.classroomId || data.result?.id)) {
        return { classroomId: data.result?.classroomId || data.result?.id };
      }
      if (data.status === 'failed') {
        return { classroomId: null, error: data.error };
      }
    } catch (e) {
      log.warn('Poll error:', e);
    }
  }
  return { classroomId: null, error: 'Timeout' };
}

function buildRequirement(lesson: any, course: any, allLessons: any[]): string {
  const content = (lesson.content ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const otherTopics = allLessons.filter((l) => l.id !== lesson.id).slice(0, 10).map((l) => `- ${l.title}`).join('\n');

  return `Create an interactive classroom lesson about: "${lesson.title}"
Course: "${course?.title ?? ''}"
${otherTopics ? `Other topics: ${otherTopics}` : ''}
Content: ${content.substring(0, 4000)}
Include quizzes and interactive examples. Duration: ${lesson.duration_minutes ?? 15} min.`;
}
