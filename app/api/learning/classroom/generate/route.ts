import { type NextRequest } from 'next/server';
import { apiSuccess, apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { supabaseQuery, supabaseQuerySingle, supabaseUpsert, TABLES } from '@/lib/learning/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('Classroom Generate API');

/**
 * POST /api/learning/classroom/generate
 * Generate an OpenMAIC classroom from a lesson.
 *
 * Flow:
 * 1. Fetch lesson + course content from Supabase
 * 2. Build requirement string
 * 3. POST to OpenMAIC's /api/generate-classroom
 * 4. Poll until done
 * 5. Save classroom_id to lesson record
 * 6. Return classroom URL
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

    // Fetch course info for context
    const { data: course } = await supabaseQuerySingle<any>(TABLES.COURSES, {
      filters: { id: `eq.${course_id}` },
    });

    // Fetch all lessons in this course for context
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

    const courseTitle = course?.title ?? 'Course';
    const courseDesc = course?.description ?? '';

    // Build requirement string
    const requirement = buildClassroomRequirement(lesson, courseTitle, courseDesc, allLessons);

    // Call OpenMAIC's server-side generation API
    const baseUrl = 'http://localhost:3000';
    const genRes = await fetch(`${baseUrl}/api/generate-classroom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement,
        agentMode: 'generate',
      }),
    });

    if (!genRes.ok) {
      const errText = await genRes.text();
      log.error('Generation API failed:', errText);
      return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Failed to start classroom generation', errText);
    }

    const genData = await genRes.json();
    const jobId = genData.jobId;

    // Poll until done (max 5 minutes)
    let classroomId: string | null = null;
    let status = 'running';
    let attempts = 0;
    const maxAttempts = 60; // 60 * 5s = 300s = 5min

    while (status === 'running' || status === 'pending') {
      if (attempts >= maxAttempts) {
        return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 504, 'Classroom generation timed out (5 minutes)');
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;

      try {
        const pollRes = await fetch(`${baseUrl}/api/generate-classroom/${jobId}`);
        const pollData = await pollRes.json();

        status = pollData.status;

        if (status === 'succeeded' && pollData.result?.id) {
          classroomId = pollData.result.id;
          break;
        }

        if (status === 'failed') {
          return apiError(API_ERROR_CODES.UPSTREAM_ERROR, 500, 'Classroom generation failed', pollData.error);
        }
      } catch (pollErr) {
        log.warn('Poll error (retrying):', pollErr);
      }
    }

    if (!classroomId) {
      return apiError(API_ERROR_CODES.INTERNAL_ERROR, 500, 'No classroom ID returned');
    }

    // Save classroom_id to lesson record
    await supabaseUpsert(TABLES.LESSONS, {
      id: lesson_id,
      classroom_id: classroomId,
    }, 'id');

    return apiSuccess({
      classroom_id: classroomId,
      url: `/classroom/${classroomId}`,
      cached: false,
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

/**
 * Build a rich requirement string for OpenMAIC's classroom generator.
 */
function buildClassroomRequirement(
  lesson: any,
  courseTitle: string,
  courseDescription: string,
  allLessons: any[],
): string {
  const lessonContent = lesson.content ?? '';
  const strippedContent = lessonContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const otherTopics = allLessons
    .filter((l) => l.id !== lesson.id)
    .slice(0, 10)
    .map((l) => `- ${l.title}`)
    .join('\n');

  return `Create an interactive, engaging classroom lesson about: "${lesson.title}"

This lesson is part of the course: "${courseTitle}"
Course description: ${courseDescription}

Lesson content to teach:
${strippedContent.substring(0, 6000)}

Other topics in this course (for context):
${otherTopics}

Requirements:
- Create clear, educational slides with examples
- Include interactive quiz questions to test understanding
- Use code examples where appropriate
- Make it engaging for pharmaceutical/science students
- Include a summary slide at the end
- Target duration: ${lesson.duration_minutes ?? 15} minutes
- Language: English`;
}
