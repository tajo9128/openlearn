/**
 * Brain Recommender — the core recommendation engine.
 *
 * Uses OpenMAIC's callLLM via resolveModel({ stage: 'brain' }) to generate
 * personalized recommendations, study plans, and knowledge gap analysis.
 */

import { resolveModel } from '@/lib/server/resolve-model';
import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';
import { buildLearnerContext, getCourseStructure } from './brain-context';
import {
  buildBrainSystemPrompt,
  buildRecommendationPrompt,
  buildStudyPlanPrompt,
  buildGapsPrompt,
  buildAskSystemPrompt,
} from './brain-prompt';
import type {
  BrainRecommendation,
  RecommendationResponse,
  StudyPlan,
  KnowledgeGapResponse,
  BrainAnswer,
} from './brain-types';

const log = createLogger('Brain');

/**
 * Extract JSON from LLM response (handles markdown code fences, leading text).
 */
function extractJSON(text: string): any {
  // Remove markdown code fences
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  // Find first { and last }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('No JSON object found in response');
  }
  cleaned = cleaned.substring(start, end + 1);

  return JSON.parse(cleaned);
}

/**
 * Resolve the model for Brain calls.
 * Accepts client-provided model/key (BYOK) with server-side MODEL_ROUTES override.
 */
async function getBrainModel(opts?: {
  modelString?: string;
  apiKey?: string;
  baseUrl?: string;
  providerType?: string;
}) {
  const resolved = await resolveModel({
    stage: 'brain' as any,
    modelString: opts?.modelString,
    apiKey: opts?.apiKey,
    baseUrl: opts?.baseUrl,
    providerType: opts?.providerType,
  });
  if (!resolved?.model) {
    throw new Error(
      'No AI model configured. Open Settings (gear icon) and add an API key for a provider like OpenAI, Anthropic, or DeepSeek.',
    );
  }
  return resolved;
}

/**
 * Get personalized "Next Best Action" recommendations for a student.
 */
export async function getRecommendations(
  userId: string,
  modelOpts?: { modelString?: string; apiKey?: string; baseUrl?: string; providerType?: string },
): Promise<RecommendationResponse> {
  log.info(`Building recommendations for user ${userId}`);

  const ctx = await buildLearnerContext(userId);
  const systemPrompt = buildBrainSystemPrompt();
  const userPrompt = buildRecommendationPrompt(ctx);

  const { model } = await getBrainModel(modelOpts);

  const result = await callLLM(
    {
      model,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 2000,
    },
    'brain',
    { retries: 1, validate: (text) => text.includes('{') },
  );

  const parsed = extractJSON(result.text);

  return {
    recommendations: (parsed.recommendations ?? []).map((r: any) => ({
      type: r.type ?? 'explore_topic',
      title: r.title ?? 'Recommendation',
      description: r.description ?? '',
      target_id: r.target_id ?? '',
      target_type: r.target_type ?? 'course',
      priority: r.priority ?? 'medium',
      reason: r.reason ?? '',
    })) as BrainRecommendation[],
    summary: parsed.summary ?? 'Analysis complete.',
  };
}

/**
 * Generate a personalized study plan for a specific course.
 */
export async function getStudyPlan(
  userId: string,
  courseId: string,
  daysAvailable = 7,
  modelOpts?: { modelString?: string; apiKey?: string; baseUrl?: string; providerType?: string },
): Promise<StudyPlan> {
  log.info(`Building study plan for user ${userId}, course ${courseId}`);

  const structure = await getCourseStructure(courseId);
  if (!structure.course) {
    throw new Error('Course not found');
  }

  // Get completed lesson IDs for this user
  const { supabaseQuery, TABLES } = await import('@/lib/learning/supabase-client');
  const { data: progress } = await supabaseQuery<any>(TABLES.PROGRESS, {
    filters: { user_id: `eq.${userId}`, course_id: `eq.${courseId}`, status: 'eq.completed' },
  });
  const completedIds = (progress ?? []).map((p: any) => p.lesson_id);

  const systemPrompt = buildBrainSystemPrompt();
  const userPrompt = buildStudyPlanPrompt(
    structure.course.title,
    structure.lessons.map((l: any) => ({
      id: l.id,
      title: l.title,
      duration_minutes: l.duration_minutes ?? 15,
    })),
    structure.exercises.map((e: any) => ({ id: e.id, title: e.title })),
    completedIds,
    daysAvailable,
  );

  const { model } = await getBrainModel(modelOpts);

  const result = await callLLM(
    {
      model,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 3000,
    },
    'brain',
    { retries: 1, validate: (text) => text.includes('{') },
  );

  const parsed = extractJSON(result.text);

  return {
    courseId,
    courseTitle: structure.course.title,
    totalDays: parsed.totalDays ?? daysAvailable,
    totalLessons: parsed.totalLessons ?? 0,
    totalExercises: parsed.totalExercises ?? 0,
    days: (parsed.days ?? []).map((d: any, idx: number) => ({
      dayNumber: d.dayNumber ?? idx + 1,
      date: d.date ?? '',
      title: d.title ?? `Day ${idx + 1}`,
      lessonIds: d.lessonIds ?? [],
      lessonTitles: d.lessonTitles ?? [],
      exerciseIds: d.exerciseIds ?? [],
      estimatedMinutes: d.estimatedMinutes ?? 30,
      goal: d.goal ?? '',
    })),
  };
}

/**
 * Identify knowledge gaps based on exercise performance.
 */
export async function getKnowledgeGaps(
  userId: string,
  courseId: string,
  modelOpts?: { modelString?: string; apiKey?: string; baseUrl?: string; providerType?: string },
): Promise<KnowledgeGapResponse> {
  log.info(`Analyzing knowledge gaps for user ${userId}, course ${courseId}`);

  const structure = await getCourseStructure(courseId);
  if (!structure.course) {
    throw new Error('Course not found');
  }

  // Get exercise submissions
  const { supabaseQuery, TABLES } = await import('@/lib/learning/supabase-client');
  const { data: submissions } = await supabaseQuery<any>(TABLES.EXERCISE_SUBMISSIONS, {
    filters: { user_id: `eq.${userId}` },
    order: { column: 'submitted_at', ascending: false },
  });

  // Match submissions to this course's exercises
  const courseExerciseIds = new Set(structure.exercises.map((e: any) => e.id));
  const relevantScores = (submissions ?? [])
    .filter((s: any) => courseExerciseIds.has(s.exercise_id))
    .map((s: any) => {
      const ex = structure.exercises.find((e: any) => e.id === s.exercise_id);
      return {
        exerciseId: s.exercise_id,
        exerciseTitle: ex?.title ?? 'Exercise',
        percentage: s.max_score > 0 ? Math.round((s.score / s.max_score) * 100) : 0,
        score: s.score,
        maxScore: s.max_score,
      };
    });

  if (relevantScores.length === 0) {
    return {
      gaps: [],
      overallAssessment: 'No quiz submissions found for this course yet. Complete some exercises to get gap analysis.',
    };
  }

  const systemPrompt = buildBrainSystemPrompt();
  const userPrompt = buildGapsPrompt(
    structure.course.title,
    relevantScores,
    structure.lessons.map((l: any) => ({ id: l.id, title: l.title })),
  );

  const { model } = await getBrainModel(modelOpts);

  const result = await callLLM(
    {
      model,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 2000,
    },
    'brain',
    { retries: 1, validate: (text) => text.includes('{') },
  );

  const parsed = extractJSON(result.text);

  return {
    gaps: (parsed.gaps ?? []).map((g: any) => ({
      topic: g.topic ?? 'Unknown topic',
      courseId,
      exerciseId: g.exerciseId ?? '',
      score: g.score ?? 0,
      suggestion: g.suggestion ?? '',
      relatedLessonId: g.relatedLessonId ?? null,
    })),
    overallAssessment: parsed.overallAssessment ?? 'Analysis complete.',
  };
}

/**
 * Answer a student question with full course context.
 */
export async function answerQuestion(
  userId: string,
  courseId: string,
  question: string,
  modelOpts?: { modelString?: string; apiKey?: string; baseUrl?: string; providerType?: string },
): Promise<BrainAnswer> {
  log.info(`Answering question for user ${userId}, course ${courseId}`);

  const structure = await getCourseStructure(courseId);
  if (!structure.course) {
    throw new Error('Course not found');
  }

  const systemPrompt = buildAskSystemPrompt(
    structure.course.title,
    structure.course.description ?? '',
  );

  // Include lesson summaries for context
  const lessonContext = structure.lessons
    .slice(0, 15)
    .map((l: any) => `- ${l.title}`)
    .join('\n');

  const { model } = await getBrainModel(modelOpts);

  const result = await callLLM(
    {
      model,
      system: systemPrompt + '\n\n## Course Lessons\n' + lessonContext,
      prompt: question,
      maxOutputTokens: 1500,
    },
    'brain',
  );

  // Try to parse as JSON, fall back to plain text
  try {
    const parsed = extractJSON(result.text);
    return {
      answer: parsed.answer ?? result.text,
      sources: parsed.sources ?? [],
      relatedTopics: parsed.relatedTopics ?? [],
    };
  } catch {
    return {
      answer: result.text,
      sources: [],
      relatedTopics: [],
    };
  }
}
