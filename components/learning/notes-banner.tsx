'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';

/**
 * Contextual internal link to the B.Pharm Python notes book page.
 * Rendered on Python-course lesson pages — hundreds of relevant
 * internal links to /b-pharmacy-python-notes for SEO.
 */
export function NotesBanner({ variant = 'compact' }: { variant?: 'compact' | 'full' }) {
  if (variant === 'compact') {
    return (
      <Link
        href="/b-pharmacy-python-notes"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
      >
        <FileText className="w-4 h-4" />
        Free BP-101T Python Notes PDF — all 5 units
      </Link>
    );
  }
  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
        <FileText className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-neutral-900 dark:text-white text-sm">
          B.Pharm Python Notes — Free PDF (All 5 Units, PCI Syllabus)
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Handwritten notes by Dr. Tajuddin — download unit-wise or the complete book
        </p>
      </div>
      <Link
        href="/b-pharmacy-python-notes"
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap"
      >
        Get Notes
      </Link>
    </div>
  );
}
