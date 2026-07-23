/**
 * Answer data types adapted from ClassroomIO
 * Source: /opt/classroomio/packages/question-types/src/answer-data.ts
 *
 * Discriminated union for per-question answer payloads.
 */

export type AnswerData =
  | RadioAnswer
  | CheckboxAnswer
  | TextareaAnswer
  | TrueFalseAnswer
  | ShortAnswerAnswer
  | NumericAnswer
  | FillBlankAnswer
  | FileUploadAnswer
  | MatchingAnswer
  | OrderingAnswer
  | HotspotAnswer
  | LinkAnswer
  | WordBankAnswer
  | StarAnswer
  | VideoRecordingAnswer;
  | CodeAnswer;

export interface RadioAnswer {
  type: 'RADIO';
  value: string; // option value or id
}

export interface CheckboxAnswer {
  type: 'CHECKBOX';
  values: string[]; // selected option values or ids
}

export interface TextareaAnswer {
  type: 'TEXTAREA';
  value: string;
}

export interface TrueFalseAnswer {
  type: 'TRUE_FALSE';
  value: boolean;
}

export interface ShortAnswerAnswer {
  type: 'SHORT_ANSWER';
  value: string;
}

export interface NumericAnswer {
  type: 'NUMERIC';
  value: number;
}

export interface FillBlankAnswer {
  type: 'FILL_BLANK';
  blanks: string[]; // one entry per blank
}

export interface FileUploadAnswer {
  type: 'FILE_UPLOAD';
  fileUrls: string[];
}

export interface MatchingAnswer {
  type: 'MATCHING';
  pairs: { left: string; right: string }[];
}

export interface OrderingAnswer {
  type: 'ORDERING';
  orderedValues: string[]; // option values in user-ordered sequence
}

export interface HotspotAnswer {
  type: 'HOTSPOT';
  x: number;
  y: number;
}

export interface LinkAnswer {
  type: 'LINK';
  value: string;
}

export interface WordBankAnswer {
  type: 'WORD_BANK';
  blanks: string[];
}

export interface StarAnswer {
  type: 'STAR';
  value: number;
}

export interface VideoRecordingAnswer {
  type: 'VIDEO_RECORDING';
  videoUrl: string;
}


export interface CodeAnswer {
  type: 'CODE';
  code: string;
  stdout: string;
}
