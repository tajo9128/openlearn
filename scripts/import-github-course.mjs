#!/usr/bin/env node
/**
 * import-github-course — turn a GitHub course repo into a BioDockify Learn course.
 *
 * Catalog phase: fetch notebooks from raw.githubusercontent.com, convert them to
 * HTML lesson content, and insert course → modules → lessons into Supabase via
 * the same REST API the app uses (anon key, same as lib/learning/supabase-client).
 *
 * Generation phase: for every lesson without a classroom, drive the app's own
 * flow — POST /api/learning/classroom/generate → poll the async job → POST
 * /api/learning/classroom/save. TTS narration is produced by the pipeline
 * itself (enableTTS), so classrooms come out with audio.
 *
 * Run inside the app container (env from .env.local via compose env_file):
 *   docker exec openlearn-openmaic-1 node /app/scripts/import-github-course.mjs \
 *     --config /app/configs/github-courses/nigms-structural-biology.json
 *
 * Flags:
 *   --config <path>       course definition JSON (required)
 *   --base-url <url>      app base URL (default http://localhost:3000)
 *   --dry-run             fetch + convert, print the plan, insert nothing
 *   --skip-generation     catalog only, no classroom generation
 *   --only-lesson <n>     generate only the nth lesson (1-based, global order)
 *
 * Idempotent: existing rows are matched by title and reused, so reruns resume
 * where they left off instead of duplicating.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// ==================== CLI ====================

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { baseUrl: 'http://localhost:3000', onlyLesson: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config') out.config = args[++i];
    else if (args[i] === '--base-url') out.baseUrl = args[++i];
    else if (args[i] === '--dry-run') out.dryRun = true;
    else if (args[i] === '--skip-generation') out.skipGeneration = true;
    else if (args[i] === '--only-lesson') out.onlyLesson = parseInt(args[++i], 10);
    else {
      console.error(`[import-github-course] unknown flag: ${args[i]}`);
      process.exit(1);
    }
  }
  if (!out.config) {
    console.error('[import-github-course] --config <path> is required');
    process.exit(1);
  }
  return out;
}

// ==================== Supabase REST ====================

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ?? '';

function assertEnv() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(
      '[import-github-course] SUPABASE_URL / SUPABASE_ANON_KEY not set — run inside the app container or export them',
    );
    process.exit(1);
  }
}

async function sbQuery(table, params) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase GET ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbInsert(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase POST ${table}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
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
}

// ==================== GitHub content ====================

async function fetchRaw(repo, branch, file_path) {
  const res = await fetch(
    `https://raw.githubusercontent.com/${repo}/${branch}/${encodeURIComponent(file_path).replace(/%2F/g, '/')}`,
  );
  if (!res.ok) throw new Error(`GitHub raw ${file_path}: ${res.status}`);
  return res.text();
}

/**
 * Minimal markdown → HTML for lesson content. The generate route strips tags
 * and keeps the first 5000 chars, and the lesson page renders content as raw
 * HTML — so headings early and simple block markup is all that matters.
 */
function markdownToHtml(md) {
  const escape = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) =>
    escape(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');

  const lines = md.split('\n');
  const out = [];
  let inCode = false;
  let codeBuf = [];
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      out.push('</ul>');
      listOpen = false;
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        out.push(`<pre><code>${escape(codeBuf.join('\n'))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeList();
      const level = Math.min(h[1].length + 1, 5); // h1 → h2: keep page h1 unique
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    const li = line.match(/^\s*[-*+]\s+(.*)$/);
    if (li) {
      if (!listOpen) {
        out.push('<ul>');
        listOpen = true;
      }
      out.push(`<li>${inline(li[1])}</li>`);
      continue;
    }
    if (!line.trim()) {
      closeList();
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  if (inCode && codeBuf.length) {
    out.push(`<pre><code>${escape(codeBuf.join('\n'))}</code></pre>`);
  }
  closeList();
  return out.join('\n');
}

/** Jupyter notebook → HTML: markdown cells rendered, code cells as blocks. */
function notebookToHtml(nbJson) {
  const nb = JSON.parse(nbJson);
  const out = [];
  for (const cell of nb.cells ?? []) {
    const src = Array.isArray(cell.source) ? cell.source.join('') : (cell.source ?? '');
    if (cell.cell_type === 'markdown') {
      out.push(markdownToHtml(src));
    } else if (cell.cell_type === 'code' && src.trim()) {
      out.push(`<pre><code>${src
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
    }
  }
  return out.join('\n');
}

async function buildLessonContent(cfg, lesson) {
  const raw = await fetchRaw(cfg.repo, cfg.branch, lesson.path);
  const html = lesson.path.endsWith('.ipynb') ? notebookToHtml(raw) : markdownToHtml(raw);
  // Headings first so the generate prompt (first 5000 chars, tags stripped)
  // sees the notebook's structure; cap total size for the lesson page.
  const header = `<h2>${lesson.title}</h2><p>Source: ${cfg.repo}/${lesson.path}</p>`;
  return `${header}\n${html}`.slice(0, 15000);
}

// ==================== Catalog ====================

async function ensureCourse(cfg) {
  const existing = await sbQuery('learning_courses', {
    select: '*',
    title: `eq.${cfg.course.title}`,
    limit: '1',
  });
  if (existing.length > 0) {
    console.log(`[catalog] reusing course "${cfg.course.title}" (${existing[0].id})`);
    return existing[0];
  }
  const course = await sbInsert('learning_courses', {
    title: cfg.course.title,
    description: cfg.course.description,
    category: cfg.course.category,
    difficulty: cfg.course.difficulty,
    instructor_name: cfg.course.instructor_name,
    is_published: false,
    is_free: cfg.course.is_free ?? true,
    price: cfg.course.price ?? 0,
    duration_hours: cfg.course.duration_hours,
    tags: cfg.course.tags ?? [],
  });
  console.log(`[catalog] created course "${course.title}" (${course.id})`);
  return course;
}

async function ensureModule(courseId, title, sortOrder) {
  const existing = await sbQuery('learning_modules', {
    select: '*',
    course_id: `eq.${courseId}`,
    title: `eq.${title}`,
    limit: '1',
  });
  if (existing.length > 0) return existing[0];
  return sbInsert('learning_modules', { course_id: courseId, title, sort_order: sortOrder });
}

async function ensureLesson(courseId, moduleId, lesson, content, sortOrder) {
  const existing = await sbQuery('learning_lessons', {
    select: '*',
    module_id: `eq.${moduleId}`,
    title: `eq.${lesson.title}`,
    limit: '1',
  });
  if (existing.length > 0) {
    console.log(`[catalog] lesson exists: "${lesson.title}"`);
    return existing[0];
  }
  const row = await sbInsert('learning_lessons', {
    course_id: courseId, // NOT NULL in schema, not set by app code
    module_id: moduleId,
    title: lesson.title,
    content,
    content_type: 'text', // schema check constraint; all existing lessons use 'text'
    duration_minutes: lesson.duration_minutes ?? 40,
    sort_order: sortOrder,
  });
  console.log(`[catalog] created lesson: "${lesson.title}"`);
  return row;
}

// ==================== Classroom generation ====================

const POLL_INTERVAL_MS = 10_000;
const JOB_TIMEOUT_MS = 60 * 60_000; // slow LLM providers take 2-4 min per scene × 15 scenes

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateClassroom(baseUrl, lessonId, courseId, logLabel) {
  const startRes = await fetch(`${baseUrl}/api/learning/classroom/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lesson_id: lessonId, course_id: courseId }),
  });
  const start = await startRes.json();
  if (!startRes.ok || !start.success) {
    throw new Error(`generate failed: ${start.error ?? startRes.status}`);
  }
  if (start.cached) {
    console.log(`[gen] ${logLabel}: cached classroom ${start.classroom_id}`);
    return start.classroom_id;
  }

  console.log(`[gen] ${logLabel}: job ${start.job_id} started, polling…`);
  const deadline = Date.now() + JOB_TIMEOUT_MS;
  let lastStep = '';
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const pollRes = await fetch(`${baseUrl}${start.poll_url}`);
    const job = await pollRes.json();
    if (job.step && job.step !== lastStep) {
      console.log(`[gen] ${logLabel}: ${job.step}${job.progress ? ` (${job.progress})` : ''}`);
      lastStep = job.step;
    }
    if (job.status === 'succeeded' && job.result?.classroomId) {
      const classroomId = job.result.classroomId;
      // PATCH directly: the app's save route uses upsert, which fails on this
      // schema (insert-path NOT NULL violation) and swallows the error.
      await sbPatch('learning_lessons', lessonId, { classroom_id: classroomId });
      console.log(`[gen] ${logLabel}: classroom ${classroomId} saved`);
      return classroomId;
    }
    if (job.status === 'failed') {
      throw new Error(`job failed: ${job.error ?? 'unknown error'}`);
    }
  }
  throw new Error('job timed out after 30 min');
}

// ==================== Main ====================

const args = parseArgs();
const cfg = JSON.parse(await readFile(path.resolve(args.config), 'utf8'));

const allLessons = cfg.modules.flatMap((m, mi) =>
  m.lessons.map((l, li) => ({ ...l, moduleTitle: m.title, moduleIndex: mi, lessonIndex: li })),
);
console.log(
  `[import-github-course] ${cfg.repo} → "${cfg.course.title}": ${cfg.modules.length} modules, ${allLessons.length} lessons`,
);

if (args.dryRun) {
  for (const m of cfg.modules) {
    console.log(`  module: ${m.title}`);
    for (const l of m.lessons) console.log(`    lesson: ${l.title} ← ${l.path}`);
  }
  console.log('[dry-run] fetching + converting first lesson only…');
  console.log(buildPreview(await buildLessonContent(cfg, allLessons[0])));
} else {
  await main();
}

async function main() {

assertEnv();

// Catalog phase — idempotent
const course = await ensureCourse(cfg);
const lessons = [];
for (const [mi, m] of cfg.modules.entries()) {
  const module = await ensureModule(course.id, m.title, mi);
  for (const [li, l] of m.lessons.entries()) {
    const content = await buildLessonContent(cfg, l);
    const row = await ensureLesson(course.id, module.id, l, content, li);
    lessons.push({ ...l, row });
  }
}

// Generation phase — serial, resumable
if (!args.skipGeneration) {
  const targets = lessons
    .map((l, i) => ({ ...l, n: i + 1 }))
    .filter((l) => (args.onlyLesson ? l.n === args.onlyLesson : true));

  let failures = 0;
  for (const l of targets) {
    if (l.row.classroom_id) {
      console.log(`[gen] ${l.n}/${lessons.length} "${l.title}": already has classroom, skipping`);
      continue;
    }
    try {
      await generateClassroom(args.baseUrl, l.row.id, course.id, `${l.n}/${lessons.length} "${l.title}"`);
    } catch (err) {
      failures++;
      console.error(`[gen] ${l.n}/${lessons.length} "${l.title}" FAILED: ${err.message}`);
    }
  }
  if (failures > 0) console.error(`[import-github-course] ${failures} lesson(s) failed — rerun to retry`);
}

// Auto-publish when every lesson has a classroom
const finalLessons = await sbQuery('learning_lessons', {
  select: 'id,classroom_id',
  module_id: `in.(${(
    await sbQuery('learning_modules', { select: 'id', course_id: `eq.${course.id}` })
  )
    .map((m) => m.id)
    .join(',')})`,
});
const withClassroom = finalLessons.filter((l) => l.classroom_id).length;
if (finalLessons.length > 0 && withClassroom === finalLessons.length) {
  await sbPatch('learning_courses', course.id, { is_published: true });
  console.log(`[publish] all ${withClassroom} lessons have classrooms — course published`);
} else {
  console.log(
    `[publish] ${withClassroom}/${finalLessons.length} lessons have classrooms — course stays unpublished`,
  );
}

console.log('[import-github-course] done');
}

function buildPreview(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return `    content preview (${html.length} chars html): ${text.slice(0, 300)}…`;
}
