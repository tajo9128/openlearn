/**
 * AI Code Review — uses the Brain to review student code.
 *
 * Asks the LLM to evaluate code quality, correctness, style,
 * and suggest improvements.
 */

import { resolveModel } from '@/lib/server/resolve-model';
import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';

const log = createLogger('Code Review');

export interface ModelOpts {
  modelString?: string;
  apiKey?: string;
  baseUrl?: string;
  providerType?: string;
}

export interface CodeReviewResult {
  score: number;
  feedback: string;
  suggestions: string[];
}

/**
 * Review student code using the Brain's AI model.
 */
export async function reviewCode(params: {
  code: string;
  stdout: string;
  problemDescription: string;
  modelOpts?: ModelOpts;
}): Promise<CodeReviewResult> {
  const { code, stdout, problemDescription, modelOpts } = params;

  const resolved = await resolveModel({
    stage: 'brain' as any,
    modelString: modelOpts?.modelString,
    apiKey: modelOpts?.apiKey,
    baseUrl: modelOpts?.baseUrl,
    providerType: modelOpts?.providerType,
  });

  if (!resolved?.model) {
    throw new Error(
      'No AI model configured. Open Settings and add an API key.',
    );
  }

  const systemPrompt = `You are a Python code reviewer for pharmaceutical education.

Evaluate the student's code based on:
1. **Correctness** — Does it solve the problem?
2. **Code Quality** — Is it clean, readable, well-structured?
3. **Best Practices** — Proper naming, error handling, documentation?
4. **Pharma Knowledge** — Correct use of scientific concepts?

Return JSON:
{
  "score": <0-100>,
  "feedback": "<2-3 sentences overall assessment>",
  "suggestions": ["specific improvement 1", "specific improvement 2", ...]
}`;

  const userPrompt = `## Problem
${problemDescription}

## Student's Code
\`\`\`python
${code}
\`\`\`

## Program Output
\`\`\`
${stdout || '(no output)'}
\`\`\`

## Task
Review this code. Score it 0-100 and provide actionable feedback.`;

  const result = await callLLM(
    {
      model: resolved.model,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 1500,
    },
    'brain',
    { retries: 1, validate: (t) => t.includes('{') },
  );

  // Parse JSON response
  try {
    const cleaned = result.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      const parsed = JSON.parse(cleaned.substring(start, end + 1));
      return {
        score: Math.min(100, Math.max(0, parsed.score ?? 0)),
        feedback: parsed.feedback ?? 'No feedback available.',
        suggestions: parsed.suggestions ?? [],
      };
    }
  } catch {
    log.warn('Failed to parse code review JSON, using text');
  }

  return {
    score: 0,
    feedback: result.text,
    suggestions: [],
  };
}
