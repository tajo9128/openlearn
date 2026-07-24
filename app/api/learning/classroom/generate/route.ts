import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseQuerySingle, supabaseQuery, TABLES } from '@/lib/learning/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('Classroom Generate API');

/**
 * POST /api/learning/classroom/generate
 * Start classroom generation — returns jobId immediately.
 * Client polls /api/generate-classroom/{jobId} for status.
 * When status=succeeded, save classroom_id to lesson.
 */
export async function POST(request: NextRequest) {
  try {
    const { lesson_id, course_id } = await request.json();

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

    // Build requirement with Dr. Tajuddin + 15 slides
    const requirement = buildRequirement(lesson, course, allLessons);

    // Start generation job
    const baseUrl = 'http://localhost:3000';
    const genRes = await fetch(`${baseUrl}/api/generate-classroom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirement, agentMode: 'generate', enableTTS: true }),
    });

    if (!genRes.ok) {
      const errText = await genRes.text();
      log.error('Generation API failed:', errText);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to start generation', errText);
    }

    const genData = await genRes.json();

    // Return job ID immediately — client/batch script polls for completion
    return apiSuccess({
      job_id: genData.jobId,
      poll_url: `/api/generate-classroom/${genData.jobId}`,
      save_url: `/api/learning/classroom/save`,
      message: 'Generation started. Poll poll_url until status=succeeded, then POST to save_url with {lesson_id, classroom_id}.',
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

function buildRequirement(lesson: any, course: any, allLessons: any[]): string {
  const content = (lesson.content ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const otherTopics = allLessons.filter((l: any) => l.id !== lesson.id).slice(0, 10).map((l: any) => '- ' + l.title).join('\n');

  return 'Create an interactive classroom lesson about: "' + lesson.title + '"\n\n' +
    'This lesson is part of the course: "' + (course?.title ?? '') + '"\n' +
    'Course description: ' + (course?.description ?? '') + '\n\n' +
    'The instructor for this course is Dr. Tajuddin, a pharmaceutical research expert and educator.\n' +
    'Create agent profiles where the main teacher/agent is named "Dr. Tajuddin" with the role of instructor.\n\n' +
    'Lesson content to teach:\n' + content.substring(0, 5000) + '\n\n' +
    'Other topics in this course:\n' + otherTopics + '\n\n' +
    'Requirements:\n' +
    '- Include voice narration (TTS) for all slides\n' +
    '- The speaker should be introduced as Dr. Tajuddin\n' +
    '- Include interactive quiz questions\n' +
    '- Use code examples where appropriate\n' +
    '- Create EXACTLY 15 slides/scenes - this is mandatory\n' +
    '- Target duration: ' + (lesson.duration_minutes ?? 15) + ' minutes\n' +
    '- Language: English';
}
