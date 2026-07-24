import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseQuerySingle, supabaseQuery, supabaseUpsert, TABLES } from '@/lib/learning/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('Classroom Generate API');

/**
 * POST /api/learning/classroom/generate
 * Generate an OpenMAIC classroom from a lesson with TTS audio.
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

    // Build requirement with Dr. Tajuddin as instructor
    const requirement = buildRequirement(lesson, course, allLessons);

    // Start generation job with TTS and agent profiles
    const baseUrl = 'http://localhost:3000';
    const genRes = await fetch(`${baseUrl}/api/generate-classroom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement,
        agentMode: 'generate',
        enableTTS: true,
      }),
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

    // Otherwise return jobId immediately
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

This lesson is part of the course: "${course?.title ?? ''}"
Course description: ${course?.description ?? ''}

The instructor for this course is Dr. Tajuddin, a pharmaceutical research expert and educator.
Create agent profiles where the main teacher/agent is named "Dr. Tajuddin" with the role of instructor.

Lesson content to teach:
${content.substring(0, 5000)}

Other topics in this course:
${otherTopics}

Requirements:
- Include voice narration (TTS) for all slides
- The speaker should be introduced as Dr. Tajuddin
- Include interactive quiz questions
- Use code examples where appropriate
- Target duration: ${lesson.duration_minutes ?? 15} minutes
- Language: English`;
}
