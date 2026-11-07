#!/usr/bin/env node
/**
 * batch-generate-classrooms.mjs
 *
 * Scans PostgreSQL/Supabase for all lessons missing classrooms (classroom_id IS NULL or empty),
 * triggers classroom generation via OpenMAIC API, polls progress, saves the resulting classroom_id,
 * and publishes courses when 100% complete.
 *
 * Usage:
 *   node scripts/batch-generate-classrooms.mjs [--concurrency 2] [--course-id <id>] [--base-url http://localhost:3000]
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://openlearn-db-gateway';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_hcLJM5zKA_GR8o4tIv_CIA_mrWuoy2A';
const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const POLL_INTERVAL_MS = 5000;
const JOB_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes max per classroom
const MAX_RETRIES = 3;

// Parse args
const args = process.argv.slice(2);
let concurrency = 2;
let targetCourseId = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--concurrency') concurrency = parseInt(args[++i], 10) || 2;
  else if (args[i] === '--course-id') targetCourseId = args[++i];
}

async function sbQuery(table, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase GET ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbPatch(table, id, patch) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set('id', `eq.${id}`);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateSingleClassroom(lesson, course, logPrefix) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[${new Date().toISOString()}] ${logPrefix} (Attempt ${attempt}/${MAX_RETRIES}) Starting generation for "${lesson.title}"...`);
      
      const startRes = await fetch(`${BASE_URL}/api/learning/classroom/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: lesson.id, course_id: lesson.course_id }),
      });

      const startData = await startRes.json();
      if (!startRes.ok || !startData.success) {
        throw new Error(`Generate API returned error: ${startData.error || startRes.statusText}`);
      }

      if (startData.cached && startData.classroom_id) {
        console.log(`[${new Date().toISOString()}] ${logPrefix} Classroom cached: ${startData.classroom_id}`);
        await sbPatch('learning_lessons', lesson.id, { classroom_id: startData.classroom_id });
        return startData.classroom_id;
      }

      const jobId = startData.job_id;
      const pollUrl = `${BASE_URL}${startData.poll_url}`;
      console.log(`[${new Date().toISOString()}] ${logPrefix} Job started (ID: ${jobId}), polling ${pollUrl}...`);

      const deadline = Date.now() + JOB_TIMEOUT_MS;
      let lastStep = '';

      while (Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS);
        const pollRes = await fetch(pollUrl);
        if (!pollRes.ok) {
          console.warn(`[${new Date().toISOString()}] ${logPrefix} Poll HTTP ${pollRes.status}, continuing...`);
          continue;
        }

        const job = await pollRes.json();
        const currentStep = `${job.step || 'working'}${job.progress ? ` (${job.progress}%)` : ''}`;
        if (currentStep !== lastStep) {
          console.log(`[${new Date().toISOString()}] ${logPrefix} [${jobId}] Step: ${currentStep} - ${job.message || ''}`);
          lastStep = currentStep;
        }

        if (job.status === 'succeeded') {
          const classroomId = job.result?.classroomId || job.result?.id || (job.stage && job.stage.id);
          if (!classroomId) {
            throw new Error(`Job succeeded but no classroomId found in result: ${JSON.stringify(job.result)}`);
          }

          console.log(`[${new Date().toISOString()}] ${logPrefix} ✅ Job succeeded! Classroom ID: ${classroomId}. Updating database...`);
          await sbPatch('learning_lessons', lesson.id, { classroom_id: classroomId });
          console.log(`[${new Date().toISOString()}] ${logPrefix} 💾 Database updated for lesson "${lesson.title}" -> ${classroomId}`);
          return classroomId;
        }

        if (job.status === 'failed') {
          throw new Error(`Job failed: ${job.error || 'Unknown error'}`);
        }
      }

      throw new Error(`Job timed out after ${JOB_TIMEOUT_MS / 60000} minutes`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] ${logPrefix} ❌ Attempt ${attempt} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        const waitBackoff = attempt * 10000;
        console.log(`[${new Date().toISOString()}] ${logPrefix} Waiting ${waitBackoff / 1000}s before retrying...`);
        await sleep(waitBackoff);
      } else {
        throw err;
      }
    }
  }
}

async function checkAndPublishCourse(courseId, courseTitle) {
  try {
    const modules = await sbQuery('learning_modules', { select: 'id', course_id: `eq.${courseId}` });
    const moduleIds = modules.map((m) => m.id);
    if (moduleIds.length === 0) return;

    const lessons = await sbQuery('learning_lessons', {
      select: 'id,classroom_id',
      module_id: `in.(${moduleIds.join(',')})`,
    });

    const total = lessons.length;
    const completed = lessons.filter((l) => Boolean(l.classroom_id)).length;

    console.log(`[${new Date().toISOString()}] [Publish Check] Course "${courseTitle}": ${completed}/${total} lessons have classrooms`);

    if (total > 0 && completed === total) {
      await sbPatch('learning_courses', courseId, { is_published: true });
      console.log(`[${new Date().toISOString()}] 🚀 [PUBLISHED] Course "${courseTitle}" is now 100% complete and PUBLISHED!`);
    }
  } catch (err) {
    console.error(`[Publish Check] Error checking course publication status:`, err.message);
  }
}

async function main() {
  console.log('================================================================================');
  console.log('       BIODOCKIFY LEARN - BATCH CLASSROOM GENERATION RUNNER                     ');
  console.log('================================================================================');
  console.log(`Concurrency: ${concurrency}`);
  console.log(`App Base URL: ${BASE_URL}`);
  console.log(`Database URL: ${SUPABASE_URL}\n`);

  // 1. Fetch missing lessons
  const lessonParams = {
    select: 'id,course_id,module_id,title,sort_order,classroom_id',
    or: '(classroom_id.is.null,classroom_id.eq.)',
    order: 'course_id,sort_order',
  };
  if (targetCourseId) {
    lessonParams.course_id = `eq.${targetCourseId}`;
  }

  const missingLessons = await sbQuery('learning_lessons', lessonParams);
  console.log(`Found ${missingLessons.length} lessons missing classrooms.\n`);

  if (missingLessons.length === 0) {
    console.log('✅ All lessons already have classrooms! Nothing to do.');
    return;
  }

  // Fetch course details
  const courseIds = [...new Set(missingLessons.map((l) => l.course_id))];
  const coursesData = await sbQuery('learning_courses', {
    select: 'id,title',
    id: `in.(${courseIds.join(',')})`,
  });
  const courseMap = new Map(coursesData.map((c) => [c.id, c]));

  console.log(`Affected courses (${courseIds.length}):`);
  for (const cid of courseIds) {
    const cname = courseMap.get(cid)?.title || cid;
    const clessons = missingLessons.filter((l) => l.course_id === cid);
    console.log(`  - "${cname}": ${clessons.length} lessons missing`);
  }
  console.log('--------------------------------------------------------------------------------\n');

  let completedCount = 0;
  let failedCount = 0;
  const queue = [...missingLessons];
  const total = missingLessons.length;

  async function worker(workerId) {
    while (queue.length > 0) {
      const lesson = queue.shift();
      if (!lesson) break;

      const course = courseMap.get(lesson.course_id) || { id: lesson.course_id, title: 'Unknown Course' };
      const currentIdx = total - queue.length;
      const logPrefix = `[Worker ${workerId}] [${currentIdx}/${total}] [${course.title}]`;

      try {
        await generateSingleClassroom(lesson, course, logPrefix);
        completedCount++;
        await checkAndPublishCourse(course.id, course.title);
      } catch (err) {
        failedCount++;
        console.error(`${logPrefix} ❌ FAILED after all retries: ${err.message}`);
      }
    }
  }

  console.log(`Starting ${concurrency} worker(s)...`);
  const workerPromises = Array.from({ length: concurrency }, (_, i) => worker(i + 1));
  await Promise.all(workerPromises);

  console.log('\n================================================================================');
  console.log('                         BATCH GENERATION COMPLETED                             ');
  console.log('================================================================================');
  console.log(`Total Processed: ${total}`);
  console.log(`Successfully Generated: ${completedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log('================================================================================\n');
}

main().catch((err) => {
  console.error('Fatal error in batch generator:', err);
  process.exit(1);
});
