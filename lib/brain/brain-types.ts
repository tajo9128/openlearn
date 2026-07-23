/**
 * BioDockify Brain — Type Definitions
 *
 * The Brain is an AI learning advisor that provides "Next Best Action"
 * recommendations, study plans, knowledge gap analysis, and contextual Q&A.
 */

// ==================== Learner Context ====================

export interface EnrolledCourseInfo {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  duration_hours: number | null;
}

export interface CourseProgressInfo {
  courseId: string;
  courseTitle: string;
  lessonsCompleted: number;
  totalLessons: number;
  percentage: number;
  nextLessonId: string | null;
  nextLessonTitle: string | null;
}

export interface ExerciseScoreInfo {
  exerciseId: string;
  exerciseTitle: string;
  courseId: string;
  score: number;
  maxScore: number;
  percentage: number;
  submittedAt: string;
}

export interface ComplianceStatusInfo {
  courseId: string;
  courseTitle: string;
  status: string;
  dueDate: string | null;
  validUntil: string | null;
  cycleNumber: number;
}

export interface LearnerContext {
  userId: string;
  enrolledCourses: EnrolledCourseInfo[];
  progress: CourseProgressInfo[];
  exerciseScores: ExerciseScoreInfo[];
  complianceStatus: ComplianceStatusInfo[];
  totalCoursesEnrolled: number;
  totalLessonsCompleted: number;
  averageScore: number | null;
  lastActiveDate: string | null;
}

// ==================== Recommendations ====================

export type RecommendationType =
  | 'continue_lesson'
  | 'start_course'
  | 'review_weakness'
  | 'retake_quiz'
  | 'complete_compliance'
  | 'practice_coding'
  | 'explore_topic';

export type RecommendationPriority = 'high' | 'medium' | 'low';

export type TargetType = 'lesson' | 'course' | 'exercise' | 'module';

export interface BrainRecommendation {
  type: RecommendationType;
  title: string;
  description: string;
  target_id: string;
  target_type: TargetType;
  priority: RecommendationPriority;
  reason: string;
}

export interface RecommendationResponse {
  recommendations: BrainRecommendation[];
  summary: string;
}

// ==================== Study Plan ====================

export interface StudyPlanDay {
  dayNumber: number;
  date: string;
  title: string;
  lessonIds: string[];
  lessonTitles: string[];
  exerciseIds: string[];
  estimatedMinutes: number;
  goal: string;
}

export interface StudyPlan {
  courseId: string;
  courseTitle: string;
  totalDays: number;
  totalLessons: number;
  totalExercises: number;
  days: StudyPlanDay[];
}

// ==================== Knowledge Gaps ====================

export interface KnowledgeGap {
  topic: string;
  courseId: string;
  exerciseId: string;
  score: number;
  suggestion: string;
  relatedLessonId: string | null;
}

export interface KnowledgeGapResponse {
  gaps: KnowledgeGap[];
  overallAssessment: string;
}

// ==================== Brain Q&A ====================

export interface BrainAnswer {
  answer: string;
  sources: string[];
  relatedTopics: string[];
}
