'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, Download, FileText, Eye, Lock, ChevronLeft, CheckCircle2,
  FlaskConical, GraduationCap, Printer,
} from 'lucide-react';

const UNITS = [
  {
    id: 1,
    title: 'Unit 1 — Introduction to Python & Pharmaceutical Applications',
    status: 'available',
    pdf: '/notes/unit-1-python-for-pharmacists.pdf',
    docx: '/notes/unit-1-python-for-pharmacists.docx',
    topics: [
      'Python basics, installation & IDE setup',
      'Variables, data types & operators',
      'Input/output operations',
      'Control statements (if, loops)',
      'Pharmaceutical examples & applications',
    ],
  },
  { id: 2, title: 'Unit 2 — Functions, Modules & Strings', status: 'coming', topics: [] },
  { id: 3, title: 'Unit 3 — Data Structures: Lists, Tuples, Sets & Dictionaries', status: 'coming', topics: [] },
  { id: 4, title: 'Unit 4 — File Handling, Exceptions & Libraries', status: 'coming', topics: [] },
  { id: 5, title: 'Unit 5 — NumPy, Pandas & Data Visualization for Pharmacy', status: 'coming', topics: [] },
];

export default function NotesPage() {
  const [activeUnit, setActiveUnit] = useState(1);
  const unit = UNITS.find((u) => u.id === activeUnit) ?? UNITS[0];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 text-sm text-emerald-200 hover:text-white mb-4"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Courses
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded-full">BP-101T</span>
                <span className="text-xs bg-amber-400/90 text-amber-950 px-2 py-0.5 rounded-full font-semibold">
                  PCI Syllabus
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Python Notes — B.Pharm 1st Semester
              </h1>
              <p className="text-emerald-100 mt-1 text-sm md:text-base">
                Basics of Python Programming for Pharmaceutical Sciences &mdash; handwritten notes
                by Dr. Tajuddin, following the PCI syllabus
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Unit tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {UNITS.map((u) => (
            <button
              key={u.id}
              onClick={() => setActiveUnit(u.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                activeUnit === u.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-emerald-300'
              }`}
            >
              {u.status === 'available' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4 opacity-50" />
              )}
              Unit {u.id}
            </button>
          ))}
        </div>

        {/* Active unit content */}
        {unit.status === 'available' ? (
          <div>
            {/* Download bar */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                    {unit.title}
                  </h2>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    Complete notes with pharmaceutical examples &middot; PDF + editable DOCX
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={unit.pdf}
                    download="BioDockify-Unit1-Python-for-Pharmacists.pdf"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </a>
                  <a
                    href={unit.docx}
                    download="BioDockify-Unit1-Python-for-Pharmacists.docx"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm font-semibold"
                  >
                    <FileText className="w-4 h-4" />
                    DOCX
                  </a>
                  <a
                    href={unit.pdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-sm font-semibold"
                  >
                    <Eye className="w-4 h-4" />
                    Open
                  </a>
                </div>
              </div>

              {/* Topics covered */}
              {unit.topics.length > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
                    Topics covered
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {unit.topics.map((t) => (
                      <span
                        key={t}
                        className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Inline PDF viewer */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Read Unit {unit.id} Notes
                </div>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-emerald-600 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </div>
              <iframe
                src={`${unit.pdf}#toolbar=1&view=FitH`}
                className="w-full border-0"
                style={{ height: '75vh' }}
                title={`Unit ${unit.id} Notes PDF`}
              />
            </div>

            {/* Link to course */}
            <div className="mt-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
                  <FlaskConical className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white">
                    Want to learn interactively?
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    Take the full video course with AI narration, quizzes & certificates
                  </p>
                </div>
              </div>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold whitespace-nowrap"
              >
                <GraduationCap className="w-4 h-4" />
                Start the Course
              </Link>
            </div>
          </div>
        ) : (
          /* Locked / coming soon unit */
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-neutral-400" />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
              {unit.title}
            </h2>
            <p className="text-neutral-500 max-w-md mx-auto">
              Notes for Unit {unit.id} are being written and will be published soon.
              Unit 1 is available now — download it above!
            </p>
            <span className="inline-block mt-4 px-4 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold">
              Coming Soon
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
