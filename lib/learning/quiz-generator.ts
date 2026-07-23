/**
 * Quiz Auto-Generator with Schema Validation and Repair
 * Adapted from DeepTutor: deeptutor/agents/question/pipeline.py
 *
 * Three-phase pipeline: Explore → Plan → Generate
 * Strict JSON validation with one-shot repair on failure.
 */

import { resolveModel } from '@/lib/server/resolve-model';
import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';

const log = createLogger('Quiz Generator');

// ==================== Types ====================

export type QuestionType = 'choice' | 'concept' | 'fill_in_blank' | 'short_answer' | 'written' | 'coding';

export interface QuizTemplate {
  question_id: string;
  topic: string;
  question_type: QuestionType;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizPlan {
  analysis: string;
  templates: QuizTemplate[];
}

export interface QuizPair {
  question_id: string;
  question: string;
  question_type: QuestionType;
  correct_answer: string;
  explanation: string;
  options?: Record<string, string> | null;
  topic?: string;
  difficulty?: string;
  metadata?: Record<string, unknown>;
}

// ==================== Constants ====================

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const CHOICE_KEYS = ['A', 'B', 'C', 'D'] as const;
const FILL_IN_BLANK_TOKEN = '____';
const CONCEPT_ANSWERS = new Set(['true', 'false']);
const TYPES_WITH_OPTIONS = new Set<QuestionType>(['choice']);

// ==================== JSON Parsing (robust) ====================

/**
 * Robustly parse JSON from LLM output.
 * Handles: code fences, leading/trailing text, partial JSON.
 */
export function parseQuizPayload(text: string): Record<string, unknown> {
  let cleaned = text.trim();
  if (!cleaned) return {};

  // Strip markdown code fences
  cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through to regex extraction
  }

  // Regex grab the largest {...} substring
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Fall through
    }
  }

  return {};
}

// ==================== Normalization ====================

/**
 * Normalize a quiz payload: force correct question_type, coerce options.
 */
export function normalizeQuizPayload(
  template: QuizTemplate,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...payload };

  // Force question_type to match template
  result.question_type = template.question_type;

  // Trim text fields
  if (typeof result.question === 'string') result.question = result.question.trim();
  if (typeof result.correct_answer === 'string') result.correct_answer = result.correct_answer.trim();
  if (typeof result.explanation === 'string') result.explanation = result.explanation.trim();

  const type = template.question_type;

  if (type === 'choice') {
    const rawOptions = result.options;
    if (rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)) {
      const clean: Record<string, string> = {};
      for (const [key, val] of Object.entries(rawOptions)) {
        const upperKey = key.toUpperCase()[0];
        if (CHOICE_KEYS.includes(upperKey as any) && val) {
          clean[upperKey] = String(val).trim();
        }
      }
      result.options = Object.keys(clean).length > 0 ? clean : null;

      // Reconcile correct_answer with option keys
      if (typeof result.correct_answer === 'string') {
        const answerUpper = result.correct_answer.toUpperCase()[0];
        if (answerUpper in clean) {
          result.correct_answer = answerUpper;
        } else {
          // Check if answer matches an option value
          for (const [k, v] of Object.entries(clean)) {
            if (v.toLowerCase() === result.correct_answer.toLowerCase()) {
              result.correct_answer = k;
              break;
            }
          }
        }
      }
    } else {
      result.options = null;
    }
  } else if (type === 'concept') {
    result.options = null;
    if (typeof result.correct_answer === 'string') {
      const lc = result.correct_answer.toLowerCase().trim();
      if (['true', 't', 'yes', 'y', '1', 'correct'].includes(lc)) {
        result.correct_answer = 'true';
      } else if (['false', 'f', 'no', 'n', '0', 'incorrect', 'wrong'].includes(lc)) {
        result.correct_answer = 'false';
      }
    }
  } else {
    result.options = null;
  }

  return result;
}

// ==================== Validation ====================

export type IssueCode =
  | 'missing_question'
  | 'missing_correct_answer'
  | 'missing_explanation'
  | 'choice_options_must_be_a_to_d'
  | 'choice_correct_answer_must_be_option_key'
  | 'concept_must_not_have_options'
  | 'concept_correct_answer_must_be_true_or_false'
  | 'fill_in_blank_must_not_have_options'
  | 'fill_in_blank_question_must_contain_blank_token'
  | 'non_choice_must_not_have_options'
  | 'non_choice_correct_answer_looks_like_option_key';

/**
 * Collect validation issues for a quiz payload.
 */
export function collectQuizIssues(
  template: QuizTemplate,
  payload: Record<string, unknown>,
): IssueCode[] {
  const issues: IssueCode[] = [];
  const question = payload.question as string | undefined;
  const correctAnswer = payload.correct_answer as string | undefined;
  const explanation = payload.explanation as string | undefined;
  const options = payload.options;
  const type = template.question_type;

  // Universal checks
  if (!question) issues.push('missing_question');
  if (!correctAnswer) issues.push('missing_correct_answer');
  if (!explanation) issues.push('missing_explanation');

  // Type-specific checks
  if (type === 'choice') {
    if (!options || typeof options !== 'object' || Array.isArray(options) ||
        !CHOICE_KEYS.every(k => k in (options as Record<string, unknown>))) {
      issues.push('choice_options_must_be_a_to_d');
    }
    if (correctAnswer && !CHOICE_KEYS.includes(correctAnswer.toUpperCase() as any)) {
      issues.push('choice_correct_answer_must_be_option_key');
    }
  } else if (type === 'concept') {
    if (options && typeof options === 'object' && Object.keys(options).length > 0) {
      issues.push('concept_must_not_have_options');
    }
    if (correctAnswer && !CONCEPT_ANSWERS.has(correctAnswer.toLowerCase().trim())) {
      issues.push('concept_correct_answer_must_be_true_or_false');
    }
  } else if (type === 'fill_in_blank') {
    if (options && typeof options === 'object' && Object.keys(options).length > 0) {
      issues.push('fill_in_blank_must_not_have_options');
    }
    if (question && !question.includes(FILL_IN_BLANK_TOKEN)) {
      issues.push('fill_in_blank_question_must_contain_blank_token');
    }
  } else {
    // short_answer, written, coding
    if (options && typeof options === 'object' && Object.keys(options).length > 0) {
      issues.push('non_choice_must_not_have_options');
    }
    if (correctAnswer && correctAnswer.length === 1 && CHOICE_KEYS.includes(correctAnswer.toUpperCase() as any)) {
      issues.push('non_choice_correct_answer_looks_like_option_key');
    }
  }

  return issues;
}

// ==================== Quiz Generation ====================

/**
 * Generate a quiz from course content using the 3-phase pipeline.
 * Phase 1: Explore (research the topic)
 * Phase 2: Plan (create quiz templates)
 * Phase 3: Generate (produce questions with validation + repair)
 */
export async function generateQuiz(params: {
  topic: string;
  content: string;
  numQuestions?: number;
  questionTypes?: QuestionType[];
  difficulty?: 'easy' | 'medium' | 'hard';
  modelOpts?: { modelString?: string; apiKey?: string; baseUrl?: string; providerType?: string };
}): Promise<QuizPair[]> {
  const {
    topic,
    content,
    numQuestions = 5,
    questionTypes = ['choice', 'concept', 'short_answer'],
    difficulty = 'medium',
    modelOpts,
  } = params;

  // Resolve model
  const resolved = await resolveModel({
    stage: 'brain' as any,
    modelString: modelOpts?.modelString,
    apiKey: modelOpts?.apiKey,
    baseUrl: modelOpts?.baseUrl,
    providerType: modelOpts?.providerType,
  });

  if (!resolved?.model) {
    throw new Error('No AI model configured. Open Settings and add an API key.');
  }

  // Phase 2: Plan (skip explore for simplicity — use content directly)
  const planPrompt = buildPlanPrompt(topic, content, numQuestions, questionTypes, difficulty);

  const planResult = await callLLM(
    {
      model: resolved.model,
      system: 'You are a quiz generator for pharmaceutical education. Create a quiz plan in JSON format.',
      prompt: planPrompt,
      maxOutputTokens: 2000,
    },
    'brain',
    { retries: 1, validate: (t) => t.includes('{') },
  );

  const planPayload = parseQuizPayload(planResult.text);
  const templates = normalizePlan(planPayload, numQuestions, questionTypes, difficulty);

  if (templates.length === 0) {
    // Fallback: create templates manually
    for (let i = 0; i < numQuestions; i++) {
      templates.push({
        question_id: `q${i + 1}`,
        topic,
        question_type: questionTypes[i % questionTypes.length],
        difficulty,
      });
    }
  }

  // Phase 3: Generate each question
  const quizPairs: QuizPair[] = [];

  for (const template of templates) {
    const quizPrompt = buildQuizPrompt(template, content, quizPairs);

    const quizResult = await callLLM(
      {
        model: resolved.model,
        system: 'You are a quiz generator. Output ONLY valid JSON for a single question.',
        prompt: quizPrompt,
        maxOutputTokens: 1000,
      },
      'brain',
    );

    let payload = parseQuizPayload(quizResult.text);
    let normalized = normalizeQuizPayload(template, payload);
    let issues = collectQuizIssues(template, normalized);

    // One-shot repair
    if (issues.length > 0) {
      log.warn(`Quiz ${template.question_id} has issues: ${issues.join(', ')}. Attempting repair...`);

      const repairPrompt = buildRepairPrompt(template, normalized, issues);
      const repairResult = await callLLM(
        {
          model: resolved.model,
          system: 'You are a quiz repair assistant. Fix the JSON to match the schema exactly.',
          prompt: repairPrompt,
          maxOutputTokens: 1500,
        },
        'brain',
      );

      const repairedPayload = parseQuizPayload(repairResult.text);
      normalized = normalizeQuizPayload(template, repairedPayload);
      issues = collectQuizIssues(template, normalized);
    }

    // Build final QuizPair
    const pair = payloadToQuizPair(template, normalized, issues);
    quizPairs.push(pair);
  }

  return quizPairs;
}

// ==================== Prompt Builders ====================

function buildPlanPrompt(
  topic: string,
  content: string,
  numQuestions: number,
  types: QuestionType[],
  difficulty: string,
): string {
  return `## Topic: ${topic}

## Source Content
${content.substring(0, 8000)}

## Task
Create a quiz plan with ${numQuestions} questions.

Allowed types: ${types.join(', ')}
Difficulty: ${difficulty}

Return JSON:
{
  "analysis": "Brief analysis of what topics to cover",
  "templates": [
    {"question_id": "q1", "topic": "specific subtopic", "question_type": "${types[0]}", "difficulty": "${difficulty}"}
  ]
}`;
}

function buildQuizPrompt(template: QuizTemplate, content: string, previous: QuizPair[]): string {
  const prevSummary = previous.length > 0
    ? previous.map(p => `- ${p.question_type}: ${p.question?.substring(0, 80)}`).join('\n')
    : '(none)';

  let typeInstructions = '';
  switch (template.question_type) {
    case 'choice':
      typeInstructions = 'Multiple choice with options A, B, C, D. correct_answer must be the letter (A/B/C/D).';
      break;
    case 'concept':
      typeInstructions = 'True/False question. correct_answer must be "true" or "false". Do NOT include options.';
      break;
    case 'fill_in_blank':
      typeInstructions = 'Fill in the blank. Question MUST contain "____". Do NOT include options.';
      break;
    case 'short_answer':
      typeInstructions = 'Short answer question. correct_answer is the expected answer text. Do NOT include options.';
      break;
    case 'coding':
      typeInstructions = 'Coding question. correct_answer is a code solution. Do NOT include options.';
      break;
    default:
      typeInstructions = 'Open-ended question. correct_answer is a model answer.';
  }

  return `## Source Content
${content.substring(0, 6000)}

## Previous Questions (avoid duplicates)
${prevSummary}

## Task
Generate ONE question about: ${template.topic}
Type: ${template.question_type} (${typeInstructions})
Difficulty: ${template.difficulty}

Return ONLY valid JSON:
{
  "question": "The question text",
  "question_type": "${template.question_type}",
  "correct_answer": "The correct answer",
  "explanation": "Why this is correct",
  ${template.question_type === 'choice' ? '"options": {"A": "option text", "B": "option text", "C": "option text", "D": "option text"}' : '"options": null'}
}`;
}

function buildRepairPrompt(
  template: QuizTemplate,
  payload: Record<string, unknown>,
  issues: IssueCode[],
): string {
  return `## Invalid Quiz JSON
${JSON.stringify(payload, null, 2)}

## Issues Found
${issues.join('\n')}

## Requirements for ${template.question_type}
${getRequirementsForType(template.question_type)}

## Task
Fix the JSON to match the schema exactly. Return ONLY valid JSON.`;
}

function getRequirementsForType(type: QuestionType): string {
  switch (type) {
    case 'choice':
      return '- Must have options with keys A, B, C, D (all 4)\n- correct_answer must be A, B, C, or D\n- Must have question, correct_answer, explanation';
    case 'concept':
      return '- correct_answer must be "true" or "false"\n- Do NOT include options\n- Must have question, correct_answer, explanation';
    case 'fill_in_blank':
      return '- Question MUST contain "____"\n- Do NOT include options\n- Must have question, correct_answer, explanation';
    default:
      return '- Do NOT include options\n- correct_answer is text (not a letter)\n- Must have question, correct_answer, explanation';
  }
}

// ==================== Helpers ====================

function normalizePlan(
  payload: Record<string, unknown>,
  numQuestions: number,
  allowedTypes: QuestionType[],
  difficulty: string,
): QuizTemplate[] {
  const templatesRaw = Array.isArray(payload.templates) ? payload.templates : [];

  return templatesRaw.slice(0, numQuestions).map((t: any, i: number) => {
    let qType = String(t.question_type ?? '').toLowerCase() as QuestionType;
    if (!allowedTypes.includes(qType)) {
      qType = allowedTypes[0] ?? 'short_answer';
    }

    let qDiff = String(t.difficulty ?? '').toLowerCase();
    if (!VALID_DIFFICULTIES.includes(qDiff as any)) {
      qDiff = difficulty;
    }

    return {
      question_id: t.question_id ?? `q${i + 1}`,
      topic: String(t.topic ?? ''),
      question_type: qType,
      difficulty: qDiff as 'easy' | 'medium' | 'hard',
    };
  });
}

function payloadToQuizPair(
  template: QuizTemplate,
  payload: Record<string, unknown>,
  issues: IssueCode[],
): QuizPair {
  return {
    question_id: template.question_id,
    question: (payload.question as string) || `[Generation failed] ${template.topic}`,
    question_type: template.question_type,
    correct_answer: (payload.correct_answer as string) || '',
    explanation: (payload.explanation as string) || '',
    options: (payload.options as Record<string, string>) || null,
    topic: template.topic,
    difficulty: template.difficulty,
    metadata: issues.length > 0 ? { issues } : undefined,
  };
}
