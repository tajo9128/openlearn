'use client';

import Link from 'next/link';
import {
  BookOpen, Target, AlertTriangle, RefreshCw, ShieldCheck,
  Code, Compass, ArrowRight,
} from 'lucide-react';
import type { BrainRecommendation as RecType } from '@/lib/brain/brain-types';

const ICONS = {
  continue_lesson: BookOpen,
  start_course: Compass,
  review_weakness: AlertTriangle,
  retake_quiz: RefreshCw,
  complete_compliance: ShieldCheck,
  practice_coding: Code,
  explore_topic: Target,
};

const PRIORITY_COLORS = {
  high: 'border-red-200 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  medium: 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  low: 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
};

const LINK_MAP: Record<string, string> = {
  lesson: '/courses',
  course: '/courses',
  exercise: '/courses',
  module: '/courses',
};

export function BrainRecommendation({ rec }: { rec: RecType }) {
  const Icon = ICONS[rec.type] ?? Target;
  const priorityColor = PRIORITY_COLORS[rec.priority] ?? PRIORITY_COLORS.medium;

  const href = rec.target_type === 'lesson'
    ? `${LINK_MAP[rec.target_type]}/${rec.target_id}`
    : rec.target_type === 'course'
      ? `/courses/${rec.target_id}`
      : `/courses`;

  return (
    <Link href={href} className="block group">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 hover:shadow-md hover:border-emerald-300 transition-all">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${priorityColor.split(' ').filter(c => c.includes('bg') || c.includes('text')).join(' ')}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-neutral-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                {rec.title}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor}`}>
                {rec.priority}
              </span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">{rec.description}</p>
            <p className="text-xs text-neutral-400 italic">{rec.reason}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-emerald-500 transition-colors shrink-0 mt-1" />
        </div>
      </div>
    </Link>
  );
}
