/**
 * Question scoring engine adapted from ClassroomIO
 * Source: /opt/classroomio/packages/question-types/src/question-scoring.ts
 *
 * Supports auto-grading for 11 question types with partial credit.
 */

import type { AnswerData } from './answer-data';
import { QUESTION_TYPE_KEY, type QuestionTypeKey } from './question-types';

// ==================== Scoring Configuration ====================

export const SCORING_MODE = {
  ALL_OR_NOTHING: 'all_or_nothing',
  PARTIAL: 'partial',
} as const;

export type ScoringMode = (typeof SCORING_MODE)[keyof typeof SCORING_MODE];

export interface ScorableQuestion {
  id: string | number;
  questionType: QuestionTypeKey;
  points: number;
  options?: { id: string | number; label: string; isCorrect: boolean; value?: string }[];
  settings?: Record<string, unknown>;
}

export interface QuestionScore {
  questionId: string | number;
  score: number;
  maxScore: number;
  isCorrect: boolean;
  autoGradable: boolean;
}

// ==================== Core Scoring Function ====================

export function scoreSubmissionAnswers(
  questions: ScorableQuestion[],
  answersByQuestionId: Record<string | number, AnswerData | null | undefined>,
): QuestionScore[] {
  return questions.map((question) => {
    const answer = answersByQuestionId[question.id];
    return scoreQuestion(question, answer);
  });
}

function scoreQuestion(
  question: ScorableQuestion,
  answer: AnswerData | null | undefined,
): QuestionScore {
  const maxScore = question.points ?? 1;

  if (!answer) {
    return {
      questionId: question.id,
      score: 0,
      maxScore,
      isCorrect: false,
      autoGradable: isAutoGradable(question.questionType),
    };
  }

  switch (question.questionType) {
    case QUESTION_TYPE_KEY.RADIO:
      return scoreRadio(question, answer, maxScore);
    case QUESTION_TYPE_KEY.CHECKBOX:
      return scoreCheckbox(question, answer, maxScore);
    case QUESTION_TYPE_KEY.TRUE_FALSE:
      return scoreTrueFalse(question, answer, maxScore);
    case QUESTION_TYPE_KEY.NUMERIC:
      return scoreNumeric(question, answer, maxScore);
    case QUESTION_TYPE_KEY.FILL_BLANK:
      return scoreFillBlank(question, answer, maxScore);
    case QUESTION_TYPE_KEY.WORD_BANK:
      return scoreWordBank(question, answer, maxScore);
    case QUESTION_TYPE_KEY.MATCHING:
      return scoreMatching(question, answer, maxScore);
    case QUESTION_TYPE_KEY.ORDERING:
      return scoreOrdering(question, answer, maxScore);
    case QUESTION_TYPE_KEY.STAR:
      return scoreStar(question, answer, maxScore);
    default:
      // TEXTAREA, SHORT_ANSWER, FILE_UPLOAD, LINK, VIDEO_RECORDING
      return {
        questionId: question.id,
        score: 0,
        maxScore,
        isCorrect: false,
        autoGradable: false,
      };
  }
}

// ==================== Individual Scorers ====================

function scoreRadio(
  question: ScorableQuestion,
  answer: AnswerData,
  maxScore: number,
): QuestionScore {
  if (answer.type !== 'RADIO') return noCredit(question.id, maxScore, true);
  const correctOption = question.options?.find((o) => o.isCorrect);
  const isCorrect = correctOption?.value === answer.value || correctOption?.id.toString() === answer.value;
  return {
    questionId: question.id,
    score: isCorrect ? maxScore : 0,
    maxScore,
    isCorrect,
    autoGradable: true,
  };
}

function scoreCheckbox(
  question: ScorableQuestion,
  answer: AnswerData,
  maxScore: number,
): QuestionScore {
  if (answer.type !== 'CHECKBOX') return noCredit(question.id, maxScore, true);
  const selected = new Set(answer.values ?? []);
  const correctOptions = question.options?.filter((o) => o.isCorrect) ?? [];
  const correctIds = new Set(correctOptions.map((o) => o.value ?? o.id.toString()));

  if (correctIds.size === 0) return noCredit(question.id, maxScore, true);

  // Partial credit: correct selections minus incorrect selections
  let correctCount = 0;
  let incorrectCount = 0;
  for (const id of selected) {
    if (correctIds.has(id)) correctCount++;
    else incorrectCount++;
  }

  const score = Math.max(0, (correctCount - incorrectCount) / correctIds.size) * maxScore;
  return {
    questionId: question.id,
    score: Math.round(score * 100) / 100,
    maxScore,
    isCorrect: score >= maxScore,
    autoGradable: true,
  };
}

function scoreTrueFalse(
  question: ScorableQuestion,
  answer: AnswerData,
  maxScore: number,
): QuestionScore {
  if (answer.type !== 'TRUE_FALSE') return noCredit(question.id, maxScore, true);
  const correctOption = question.options?.find((o) => o.isCorrect);
  const correctValue = correctOption?.label?.toLowerCase() === 'true';
  const isCorrect = answer.value === correctValue;
  return {
    questionId: question.id,
    score: isCorrect ? maxScore : 0,
    maxScore,
    isCorrect,
    autoGradable: true,
  };
}

function scoreNumeric(
  question: ScorableQuestion,
  answer: AnswerData,
  maxScore: number,
): QuestionScore {
  if (answer.type !== 'NUMERIC') return noCredit(question.id, maxScore, true);
  const correctOption = question.options?.find((o) => o.isCorrect);
  if (!correctOption) return noCredit(question.id, maxScore, true);

  const expected = parseFloat(correctOption.label);
  const actual = answer.value;
  const tolerance = (question.settings?.tolerance as number) ?? 0.01;

  if (isNaN(expected) || actual === undefined || actual === null) {
    return noCredit(question.id, maxScore, true);
  }

  const isCorrect = Math.abs(expected - actual) <= tolerance;
  return {
    questionId: question.id,
    score: isCorrect ? maxScore : 0,
    maxScore,
    isCorrect,
    autoGradable: true,
  };
}

function scoreFillBlank(
  question: ScorableQuestion,
  answer: AnswerData,
  maxScore: number,
): QuestionScore {
  if (answer.type !== 'FILL_BLANK') return noCredit(question.id, maxScore, true);
  const blanks = answer.blanks ?? [];
  const correctOptions = question.options?.filter((o) => o.isCorrect) ?? [];

  if (correctOptions.length === 0) return noCredit(question.id, maxScore, true);

  let correctCount = 0;
  for (let i = 0; i < correctOptions.length; i++) {
    const expected = correctOptions[i]?.label?.trim().toLowerCase();
    const actual = blanks[i]?.trim().toLowerCase();
    if (expected && actual && expected === actual) correctCount++;
  }

  const score = (correctCount / correctOptions.length) * maxScore;
  return {
    questionId: question.id,
    score: Math.round(score * 100) / 100,
    maxScore,
    isCorrect: correctCount === correctOptions.length,
    autoGradable: true,
  };
}

function scoreWordBank(
  question: ScorableQuestion,
  answer: AnswerData,
  maxScore: number,
): QuestionScore {
  // Word bank uses same logic as fill-in-the-blank
  return scoreFillBlank(question, answer, maxScore);
}

function scoreMatching(
  question: ScorableQuestion,
  answer: AnswerData,
  maxScore: number,
): QuestionScore {
  if (answer.type !== 'MATCHING') return noCredit(question.id, maxScore, true);
  const pairs = answer.pairs ?? [];
  const correctOptions = question.options ?? [];

  if (correctOptions.length === 0) return noCredit(question.id, maxScore, true);

  let correctCount = 0;
  for (const pair of pairs) {
    const correct = correctOptions.find((o) => (o.value ?? o.id.toString()) === pair.left);
    if (correct && correct.label === pair.right) correctCount++;
  }

  const score = (correctCount / correctOptions.length) * maxScore;
  return {
    questionId: question.id,
    score: Math.round(score * 100) / 100,
    maxScore,
    isCorrect: correctCount === correctOptions.length,
    autoGradable: true,
  };
}

function scoreOrdering(
  question: ScorableQuestion,
  answer: AnswerData,
  maxScore: number,
): QuestionScore {
  if (answer.type !== 'ORDERING') return noCredit(question.id, maxScore, true);
  const ordered = answer.orderedValues ?? [];
  const correctOptions = question.options ?? [];

  if (correctOptions.length === 0) return noCredit(question.id, maxScore, true);

  // Positional comparison
  let correctPositions = 0;
  for (let i = 0; i < correctOptions.length; i++) {
    const expectedValue = correctOptions[i]?.value ?? correctOptions[i]?.id.toString();
    if (ordered[i] === expectedValue) correctPositions++;
  }

  const score = (correctPositions / correctOptions.length) * maxScore;
  return {
    questionId: question.id,
    score: Math.round(score * 100) / 100,
    maxScore,
    isCorrect: correctPositions === correctOptions.length,
    autoGradable: true,
  };
}

function scoreStar(
  question: ScorableQuestion,
  answer: AnswerData,
  maxScore: number,
): QuestionScore {
  if (answer.type !== 'STAR') return noCredit(question.id, maxScore, true);
  const correctOption = question.options?.find((o) => o.isCorrect);
  if (!correctOption) return noCredit(question.id, maxScore, true);
  const isCorrect = answer.value?.toString() === (correctOption.value ?? correctOption.id.toString());
  return {
    questionId: question.id,
    score: isCorrect ? maxScore : 0,
    maxScore,
    isCorrect,
    autoGradable: true,
  };
}

// ==================== Helpers ====================

function noCredit(questionId: string | number, maxScore: number, autoGradable: boolean): QuestionScore {
  return { questionId, score: 0, maxScore, isCorrect: false, autoGradable };
}

function isAutoGradable(type: QuestionTypeKey): boolean {
  const manualTypes: QuestionTypeKey[] = [
    QUESTION_TYPE_KEY.TEXTAREA,
    QUESTION_TYPE_KEY.SHORT_ANSWER,
    QUESTION_TYPE_KEY.FILE_UPLOAD,
    QUESTION_TYPE_KEY.LINK,
    QUESTION_TYPE_KEY.VIDEO_RECORDING,
  ];
  return !manualTypes.includes(type);
}

export function calculateTotalScore(scores: QuestionScore[]): { total: number; maxTotal: number; percentage: number } {
  const total = scores.reduce((sum, s) => sum + s.score, 0);
  const maxTotal = scores.reduce((sum, s) => sum + s.maxScore, 0);
  const percentage = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
  return { total, maxTotal, percentage };
}

export function determineGradingState(scores: QuestionScore[]): 'auto_graded' | 'manual_required' | 'hybrid' {
  const autoGradable = scores.filter((s) => s.autoGradable);
  const manualRequired = scores.filter((s) => !s.autoGradable);

  if (manualRequired.length === 0) return 'auto_graded';
  if (autoGradable.length === 0) return 'manual_required';
  return 'hybrid';
}
