/**
 * Brain Prompt Builder — constructs system prompts for the Brain LLM calls.
 *
 * Embeds learner context into structured prompts that produce JSON output.
 */

import type { LearnerContext } from './brain-types';

/**
 * Build the core system prompt for the Brain.
 * This defines the persona, output format, and rules.
 */
export function buildBrainSystemPrompt(): string {
  return `You are the BioDockify AI Learning Advisor — an intelligent educational assistant for pharmaceutical research students.

Your role is to analyze a student's learning progress and provide personalized recommendations.

## Core Capabilities
1. **Next Best Action**: Recommend the most valuable thing the student should do next
2. **Study Planning**: Create personalized day-by-day study plans
3. **Knowledge Gap Analysis**: Identify weak areas from exercise scores
4. **Contextual Q&A**: Answer questions using course context

## Rules
- Always base recommendations on the student's actual progress data
- Never invent course IDs, lesson IDs, or exercise IDs — only use IDs provided in the context
- Prioritize: incomplete lessons > failed quizzes > new courses > exploration
- For compliance courses, flag expiring/overdue items as HIGH priority
- Keep responses concise and actionable
- If the student has no enrollments, recommend starting with beginner courses

## Output Format
Always respond with valid JSON matching the requested schema. No markdown, no explanations outside JSON.`;
}

/**
 * Build the learner context string to embed in the prompt.
 */
export function buildContextString(ctx: LearnerContext): string {
  const lines: string[] = [];

  lines.push(`## Student Profile`);
  lines.push(`- User ID: ${ctx.userId}`);
  lines.push(`- Courses enrolled: ${ctx.totalCoursesEnrolled}`);
  lines.push(`- Total lessons completed: ${ctx.totalLessonsCompleted}`);
  lines.push(`- Average quiz score: ${ctx.averageScore !== null ? ctx.averageScore + '%' : 'No quizzes taken'}`);
  lines.push(`- Last active: ${ctx.lastActiveDate ?? 'No activity yet'}`);

  if (ctx.enrolledCourses.length > 0) {
    lines.push('');
    lines.push('## Enrolled Courses');
    for (const c of ctx.enrolledCourses) {
      lines.push(`- ${c.title} [${c.category}/${c.difficulty}] (ID: ${c.id})`);
    }
  }

  if (ctx.progress.length > 0) {
    lines.push('');
    lines.push('## Course Progress');
    for (const p of ctx.progress) {
      lines.push(`- ${p.courseTitle}: ${p.lessonsCompleted}/${p.totalLessons} lessons (${p.percentage}%)`);
      if (p.nextLessonTitle) {
        lines.push(`  Next lesson: "${p.nextLessonTitle}" (ID: ${p.nextLessonId})`);
      }
    }
  }

  if (ctx.exerciseScores.length > 0) {
    lines.push('');
    lines.push('## Recent Quiz Scores');
    for (const s of ctx.exerciseScores.slice(0, 10)) {
      const status = s.percentage >= 80 ? 'PASS' : s.percentage >= 60 ? 'MARGINAL' : 'FAIL';
      lines.push(`- ${s.exerciseTitle}: ${s.percentage}% (${s.score}/${s.maxScore}) [${status}] (Exercise ID: ${s.exerciseId})`);
    }
  }

  if (ctx.complianceStatus.length > 0) {
    lines.push('');
    lines.push('## Compliance Status');
    for (const c of ctx.complianceStatus) {
      lines.push(`- ${c.courseTitle}: ${c.status} (Cycle ${c.cycleNumber})`);
      if (c.validUntil) lines.push(`  Valid until: ${c.validUntil}`);
      if (c.dueDate) lines.push(`  Due: ${c.dueDate}`);
    }
  }

  return lines.join('\n');
}

/**
 * Build the recommendation request prompt.
 */
export function buildRecommendationPrompt(ctx: LearnerContext): string {
  const context = buildContextString(ctx);

  return `${context}

## Task
Based on the student's progress above, provide 3-5 personalized recommendations.

Return JSON in this exact format:
{
  "recommendations": [
    {
      "type": "continue_lesson" | "start_course" | "review_weakness" | "retake_quiz" | "complete_compliance" | "practice_coding" | "explore_topic",
      "title": "Short actionable title",
      "description": "One sentence explaining what to do",
      "target_id": "the lesson/course/exercise ID from context",
      "target_type": "lesson" | "course" | "exercise" | "module",
      "priority": "high" | "medium" | "low",
      "reason": "Why this is recommended based on their data"
    }
  ],
  "summary": "One sentence overview of their learning status"
}

Guidelines:
- "continue_lesson" with the next incomplete lesson is almost always HIGH priority
- "review_weakness" for any quiz scored below 80%
- "complete_compliance" for expiring_soon or non_compliant items
- If no enrollments, recommend "start_course" with a beginner pharmacy course
- Use ONLY IDs that appear in the context above`;
}

/**
 * Build the study plan prompt.
 */
export function buildStudyPlanPrompt(
  courseTitle: string,
  lessons: { id: string; title: string; duration_minutes: number }[],
  exercises: { id: string; title: string }[],
  completedLessonIds: string[],
  daysAvailable: number,
): string {
  const remainingLessons = lessons.filter((l) => !completedLessonIds.includes(l.id));
  const totalMinutes = remainingLessons.reduce((sum, l) => sum + l.duration_minutes, 0);

  return `## Course: ${courseTitle}

## Remaining Lessons (${remainingLessons.length} of ${lessons.length} total)
${remainingLessons.map((l) => `- "${l.title}" (ID: ${l.id}, ${l.duration_minutes} min)`).join('\n')}

## Exercises (${exercises.length})
${exercises.map((e) => `- "${e.title}" (ID: ${e.id})`).join('\n')}

## Task
Create a ${daysAvailable}-day study plan to complete this course.
Distribute lessons across ${daysAvailable} days. Include exercises on appropriate days.
Target ~${Math.ceil(totalMinutes / daysAvailable)} minutes per day.

Return JSON:
{
  "totalDays": ${daysAvailable},
  "totalLessons": ${remainingLessons.length},
  "totalExercises": ${exercises.length},
  "days": [
    {
      "dayNumber": 1,
      "title": "Day theme",
      "lessonIds": ["lesson-id-from-above"],
      "lessonTitles": ["Lesson Title"],
      "exerciseIds": ["exercise-id-or-empty"],
      "estimatedMinutes": 45,
      "goal": "What the student should achieve"
    }
  ]
}`;
}

/**
 * Build the knowledge gaps prompt.
 */
export function buildGapsPrompt(
  courseTitle: string,
  exerciseScores: { exerciseId: string; exerciseTitle: string; percentage: number; score: number; maxScore: number }[],
  lessons: { id: string; title: string }[],
): string {
  const weakScores = exerciseScores.filter((s) => s.percentage < 80);

  return `## Course: ${courseTitle}

## Quiz Performance
${exerciseScores.map((s) => `- "${s.exerciseTitle}" (ID: ${s.exerciseId}): ${s.percentage}% [${s.percentage >= 80 ? 'Good' : 'NEEDS WORK'}]`).join('\n')}

## Available Lessons
${lessons.map((l) => `- "${l.title}" (ID: ${l.id})`).join('\n')}

## Task
Identify knowledge gaps from quiz performance. For each gap, suggest which lesson to review.

Return JSON:
{
  "gaps": [
    {
      "topic": "The topic area that needs work",
      "courseId": "course context",
      "exerciseId": "exercise-id-from-above",
      "score": 60,
      "suggestion": "Specific study advice",
      "relatedLessonId": "lesson-id-from-above-or-null"
    }
  ],
  "overallAssessment": "One sentence summary"
}`;
}

/**
 * Build the Q&A system prompt with course context.
 */
export function buildAskSystemPrompt(courseTitle: string, courseDescription: string): string {
  return `You are a knowledgeable AI tutor for the course "${courseTitle}".

Course description: ${courseDescription}

Answer the student's question clearly and concisely. Use pharmaceutical/scientific terminology appropriately. If the question is outside the course scope, gently redirect.

Keep answers under 200 words. Use examples where helpful.

Return JSON:
{
  "answer": "Your detailed answer",
  "sources": ["reference to lesson or topic"],
  "relatedTopics": ["related topics to explore"]
}`;
}
