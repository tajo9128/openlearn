/**
 * Question types adapted from ClassroomIO
 * Source: /opt/classroomio/packages/question-types/src/
 */

export const QUESTION_TYPE_KEY = {
  RADIO: 'RADIO',
  CHECKBOX: 'CHECKBOX',
  TEXTAREA: 'TEXTAREA',
  TRUE_FALSE: 'TRUE_FALSE',
  SHORT_ANSWER: 'SHORT_ANSWER',
  NUMERIC: 'NUMERIC',
  FILL_BLANK: 'FILL_BLANK',
  FILE_UPLOAD: 'FILE_UPLOAD',
  MATCHING: 'MATCHING',
  ORDERING: 'ORDERING',
  HOTSPOT: 'HOTSPOT',
  LINK: 'LINK',
  WORD_BANK: 'WORD_BANK',
  STAR: 'STAR',
  VIDEO_RECORDING: 'VIDEO_RECORDING',
  CODING: 'CODING',
} as const;

export type QuestionTypeKey = (typeof QUESTION_TYPE_KEY)[keyof typeof QUESTION_TYPE_KEY];

export interface QuestionTypeRegistryEntry {
  key: QuestionTypeKey;
  typename: string;
  label: string;
  id: number;
  autoGradable: boolean;
  supportsPartialCredit: boolean;
  manualGradingRequired: boolean;
}

export const QUESTION_TYPE_REGISTRY: QuestionTypeRegistryEntry[] = [
  { key: 'RADIO', typename: 'RADIO', label: 'Multiple Choice (Single)', id: 1, autoGradable: true, supportsPartialCredit: false, manualGradingRequired: false },
  { key: 'CHECKBOX', typename: 'CHECKBOX', label: 'Multiple Choice (Multi)', id: 2, autoGradable: true, supportsPartialCredit: true, manualGradingRequired: false },
  { key: 'TEXTAREA', typename: 'TEXTAREA', label: 'Long Text', id: 3, autoGradable: false, supportsPartialCredit: false, manualGradingRequired: true },
  { key: 'TRUE_FALSE', typename: 'TRUE_FALSE', label: 'True / False', id: 4, autoGradable: true, supportsPartialCredit: false, manualGradingRequired: false },
  { key: 'SHORT_ANSWER', typename: 'SHORT_ANSWER', label: 'Short Answer', id: 5, autoGradable: false, supportsPartialCredit: false, manualGradingRequired: true },
  { key: 'NUMERIC', typename: 'NUMERIC', label: 'Numeric', id: 6, autoGradable: true, supportsPartialCredit: false, manualGradingRequired: false },
  { key: 'FILL_BLANK', typename: 'FILL_BLANK', label: 'Fill in the Blank', id: 7, autoGradable: true, supportsPartialCredit: true, manualGradingRequired: false },
  { key: 'FILE_UPLOAD', typename: 'FILE_UPLOAD', label: 'File Upload', id: 8, autoGradable: false, supportsPartialCredit: false, manualGradingRequired: true },
  { key: 'MATCHING', typename: 'MATCHING', label: 'Matching', id: 9, autoGradable: true, supportsPartialCredit: true, manualGradingRequired: false },
  { key: 'ORDERING', typename: 'ORDERING', label: 'Ordering', id: 10, autoGradable: true, supportsPartialCredit: true, manualGradingRequired: false },
  { key: 'HOTSPOT', typename: 'HOTSPOT', label: 'Hotspot', id: 11, autoGradable: true, supportsPartialCredit: false, manualGradingRequired: false },
  { key: 'LINK', typename: 'LINK', label: 'Link', id: 12, autoGradable: false, supportsPartialCredit: false, manualGradingRequired: true },
  { key: 'WORD_BANK', typename: 'WORD_BANK', label: 'Word Bank', id: 13, autoGradable: true, supportsPartialCredit: true, manualGradingRequired: false },
  { key: 'STAR', typename: 'STAR', label: 'Star Rating', id: 14, autoGradable: true, supportsPartialCredit: false, manualGradingRequired: false },
  { key: 'VIDEO_RECORDING', typename: 'VIDEO_RECORDING', label: 'Video Recording', id: 15, autoGradable: false, supportsPartialCredit: false, manualGradingRequired: true },
  { key: 'CODING', typename: 'CODING', label: 'Code (Python)', id: 16, autoGradable: true, supportsPartialCredit: true, manualGradingRequired: false },
];

export function getQuestionTypeByKey(key: QuestionTypeKey): QuestionTypeRegistryEntry | undefined {
  return QUESTION_TYPE_REGISTRY.find((t) => t.key === key);
}

export function getAutoGradableTypes(): QuestionTypeKey[] {
  return QUESTION_TYPE_REGISTRY.filter((t) => t.autoGradable).map((t) => t.key);
}
