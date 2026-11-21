import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, FileText, CheckCircle2, GraduationCap, ChevronLeft, Eye } from 'lucide-react';
import { notFound } from 'next/navigation';

const UNITS: Record<number, { title: string; pdf: string; syllabus: string[]; examFocus: string; slug: string }> = {
  1: {
    title: 'Introduction to Python & Pharmaceutical Applications',
    pdf: '/notes/unit-1-python-for-pharmacists.pdf',
    slug: 'unit-1-python-notes-b-pharmacy',
    syllabus: [
      'Introduction to Python: history, features, applications in pharmacy',
      'Installation of Python and IDE (IDLE, VS Code, Jupyter)',
      'Variables, naming rules and data types (int, float, string, boolean)',
      'Operators: arithmetic, relational, logical, assignment',
      'Input and output statements — input(), print(), f-strings',
      'Control statements: if, if-else, nested if, for loop, while loop',
      'Break, continue and pass statements',
    ],
    examFocus:
      'Short questions usually ask Python features and applications in pharmacy; long questions cover variable types and control statements with flowchart-style explanations.',
  },
  2: {
    title: 'Functions, Modules & Strings',
    pdf: '/notes/unit-2-python-for-pharmacists.pdf',
    slug: 'unit-2-python-notes-b-pharmacy',
    syllabus: [
      'Functions: definition, calling, parameters vs arguments',
      'Types of arguments: positional, keyword, default, variable-length',
      'Return values, scope of variables (local, global)',
      'Anonymous functions — lambda',
      'Modules and packages: import, from-import, math, random, datetime',
      'Creating user-defined modules',
      'Strings: creating, indexing, slicing and string methods',
      'String formatting and pharmaceutical text processing examples',
    ],
    examFocus:
      'Expect questions on function argument types, lambda expressions, module imports and string methods — each with a short code output question.',
  },
  3: {
    title: 'Data Structures: Lists, Tuples, Sets & Dictionaries',
    pdf: '/notes/unit-3-python-for-pharmacists.pdf',
    slug: 'unit-3-python-notes-b-pharmacy',
    syllabus: [
      'Lists: creation, indexing, slicing, methods (append, insert, remove, sort)',
      'List comprehensions',
      'Tuples: creation, packing, unpacking, immutability',
      'Sets: creation, add, remove, set operations (union, intersection)',
      'Dictionaries: creation, accessing, adding, updating key-value pairs',
      'Nested data structures for patient and drug records',
      'Pharmaceutical examples: storing drug inventories and dosage data',
    ],
    examFocus:
      'The most heavily weighted unit — list vs tuple vs set vs dictionary differences appear in almost every paper, usually with code-output questions.',
  },
  4: {
    title: 'File Handling, Exceptions & Libraries',
    pdf: '/notes/unit-4-python-for-pharmacists.pdf',
    slug: 'unit-4-python-notes-b-pharmacy',
    syllabus: [
      'File handling: opening, reading, writing and closing files',
      'File modes (r, w, a) and working with CSV files',
      'The with statement and file object methods',
      'Exception handling: try, except, else, finally',
      'Built-in exceptions and raising custom exceptions',
      'Overview of important Python libraries for pharmacy',
      'Best practices for processing laboratory and clinical data',
    ],
    examFocus:
      'Common questions: file modes table, CSV read/write programs, and try-except-finally flow. A practical CSV-to-report program is a frequent long question.',
  },
  5: {
    title: 'NumPy, Pandas & Data Visualization',
    pdf: '/notes/unit-5-python-for-pharmacists.pdf',
    slug: 'unit-5-python-notes-b-pharmacy',
    syllabus: [
      'NumPy: arrays, array creation, indexing, slicing, operations',
      'Mathematical and statistical functions in NumPy',
      'Pandas: Series and DataFrame, reading CSV/Excel data',
      'Data selection, filtering, sorting and grouping',
      'Matplotlib: line plots, bar charts, histograms, scatter plots',
      'Plotting dose-response curves and drug concentration data',
      'Mini case studies: pharmaceutical data analysis workflows',
    ],
    examFocus:
      'NumPy array operations and Pandas DataFrame basics dominate. Visualization questions ask to identify plot types or write short Matplotlib programs.',
  },
};

export function generateStaticParams() {
  return Object.keys(UNITS).map((n) => ({ unit: String(n) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ unit: string }>;
}): Promise<Metadata> {
  const { unit } = await params;
  const u = UNITS[Number(unit)];
  if (!u) return {};
  const titles: Record<number, string> = {
    1: 'Unit 1 Python Notes B Pharmacy PDF Free Download | BP-101T Introduction',
    2: 'Unit 2 Python Notes B Pharmacy PDF | BP-101T Functions, Modules & Strings',
    3: 'Unit 3 Python Notes B Pharmacy PDF | BP-101T Lists, Tuples, Dicts',
    4: 'Unit 4 Python Notes B Pharmacy PDF | BP-101T File Handling & Exceptions',
    5: 'Unit 5 Python Notes B Pharmacy PDF | BP-101T NumPy, Pandas & Visualization',
  };
  return {
    title: titles[Number(unit)],
    description: `Free Unit ${unit} Python notes for B.Pharm 1st semester (BP-101T PCI syllabus): ${u.title}. Download PDF with complete syllabus topics, exam focus areas and pharmaceutical examples.`,
    alternates: { canonical: `https://learn.biodockify.com/b-pharmacy-python-notes/unit-${unit}` },
    openGraph: {
      title: titles[Number(unit)],
      description: `Free BP-101T Unit ${unit} notes PDF — ${u.title}. PCI syllabus, pharmaceutical examples, exam focus included.`,
    },
  };
}

export default async function UnitPage({ params }: { params: Promise<{ unit: string }> }) {
  const { unit: unitParam } = await params;
  const n = Number(unitParam);
  const unit = UNITS[n];
  if (!unit) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `B Pharmacy Python Unit ${n} Notes PDF — ${unit.title} (BP-101T)`,
    description: `Free download: Unit ${n} Python notes for B.Pharm (BP-101T PCI syllabus). Complete syllabus topics, exam focus and pharmaceutical examples.`,
    isPartOf: { '@type': 'Book', name: 'Python for Pharmacists — BP-101T Notes' },
    isAccessibleForFree: true,
  };

  const others = Object.keys(UNITS)
    .map(Number)
    .filter((k) => k !== n);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <Link
            href="/b-pharmacy-python-notes"
            className="inline-flex items-center gap-1.5 text-sm text-emerald-200 hover:text-white mb-3"
          >
            <ChevronLeft className="w-4 h-4" /> All B Pharmacy Python Notes
          </Link>
          <span className="text-xs font-mono bg-white/20 px-2.5 py-1 rounded-full mr-2">BP-101T</span>
          <h1 className="text-2xl md:text-4xl font-bold mt-2">
            Unit {n} Python Notes for B Pharmacy — {unit.title}
          </h1>
          <p className="text-emerald-100 mt-2">
            Free PDF download · PCI syllabus (BP-101T) · B.Pharm 1st semester · By Dr. Tajuddin
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <a
              href={unit.pdf}
              download={`BioDockify-Unit${n}-Python-for-Pharmacists.pdf`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-700 rounded-lg font-bold hover:bg-emerald-50 transition-colors"
            >
              <Download className="w-5 h-5" /> Download Unit {n} Notes (Free PDF)
            </a>
            <a
              href={unit.pdf}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/15 rounded-lg font-semibold hover:bg-white/25 transition-colors"
            >
              <Eye className="w-5 h-5" /> Read Online
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 mb-6">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">
            BP-101T Unit {n} Syllabus — {unit.title}
          </h2>
          <ul className="space-y-2">
            {unit.syllabus.map((topic) => (
              <li key={topic} className="flex items-start gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                {topic}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 mb-6">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
            Unit {n} Exam Focus — What B.Pharm Papers Ask
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {unit.examFocus}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">
            Download Other Units of BP-101T
          </h2>
          <div className="flex flex-wrap gap-2">
            {others.map((k) => (
              <Link
                key={k}
                href={`/b-pharmacy-python-notes/unit-${k}`}
                className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:border-emerald-400 transition-colors"
              >
                Unit {k} Notes PDF
              </Link>
            ))}
            <Link
              href="/b-pharmacy-python-notes"
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              Complete Book (All 5 Units)
            </Link>
          </div>
        </section>

        <section>
          <Link
            href="/courses"
            className="block bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6 text-center hover:shadow-lg transition-shadow"
          >
            <GraduationCap className="w-9 h-9 text-emerald-600 mx-auto mb-2" />
            <h2 className="font-bold text-neutral-900 dark:text-white mb-1">
              Free Video Course for BP-101T
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Learn Unit {n} interactively with AI narration, code examples and quizzes — free on BioDockify Learn
            </p>
          </Link>
        </section>
      </div>
    </div>
  );
}
