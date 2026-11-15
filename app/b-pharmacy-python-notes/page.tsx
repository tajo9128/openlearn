import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Download, FileText, CheckCircle2, GraduationCap, BookOpen,
  ChevronRight, Star, Search, Library,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'B Pharmacy Python Notes PDF Free Download | BP-101T Complete Book (All 5 Units)',
  description:
    'Free B.Pharmacy Python notes PDF download (BP-101T) — PCI syllabus, all 5 units. Python for Pharmaceutical Sciences complete book free PDF + DOCX. Notes by Dr. Tajuddin. Get the free Python book for B.Pharm 1st semester.',
  keywords: [
    'b pharmacy python notes',
    'b pharm python notes pdf',
    'BP-101T python notes',
    'python for pharmacists pdf free download',
    'b pharmacy 1st semester python notes',
    'python book for pharmacy students pdf',
    'b pharm python free book pdf',
    'basics of python programming for pharmaceutical sciences notes',
    'BP 101T notes pdf',
    'python notes for b pharmacy 1st year',
    'pharmacy python programming notes free',
    'pci syllabus python notes',
  ],
  openGraph: {
    title: 'B Pharmacy Python Notes PDF — Free Complete Book (All 5 Units)',
    description:
      'BP-101T Python for Pharmaceutical Sciences: free handwritten notes covering all 5 units per PCI syllabus. Instant PDF download.',
    type: 'website',
    url: 'https://learn.biodockify.com/b-pharmacy-python-notes',
  },
  alternates: { canonical: 'https://learn.biodockify.com/b-pharmacy-python-notes' },
};

const UNITS = [
  {
    n: 1,
    title: 'Unit 1: Introduction to Python & Pharmaceutical Applications',
    keywords: 'Python basics, variables, data types, operators, control statements',
    pdf: '/notes/unit-1-python-for-pharmacists.pdf',
  },
  {
    n: 2,
    title: 'Unit 2: Functions, Modules & Strings',
    keywords: 'Python functions, modules, string methods, pharmaceutical examples',
    pdf: '/notes/unit-2-python-for-pharmacists.pdf',
  },
  {
    n: 3,
    title: 'Unit 3: Data Structures — Lists, Tuples, Sets & Dictionaries',
    keywords: 'Python lists, tuples, sets, dictionaries, drug data management',
    pdf: '/notes/unit-3-python-for-pharmacists.pdf',
  },
  {
    n: 4,
    title: 'Unit 4: File Handling, Exceptions & Libraries',
    keywords: 'Python file handling, CSV, exception handling, pharmaceutical libraries',
    pdf: '/notes/unit-4-python-for-pharmacists.pdf',
  },
  {
    n: 5,
    title: 'Unit 5: NumPy, Pandas & Data Visualization',
    keywords: 'NumPy arrays, Pandas DataFrame, Matplotlib, dose-response analysis',
    pdf: '/notes/unit-5-python-for-pharmacists.pdf',
  },
];

const FAQS = [
  {
    q: 'Where can I download B Pharmacy Python notes PDF for free?',
    a: 'You can download free B.Pharmacy Python notes (BP-101T) PDF from BioDockify Learn. All 5 units following the PCI syllabus are available as individual unit PDFs plus a complete combined book — no signup required, instant download.',
  },
  {
    q: 'What is BP-101T in B Pharmacy 1st semester?',
    a: 'BP-101T is the PCI (Pharmacy Council of India) course code for "Basics of Python Programming for Pharmaceutical Sciences" — a theory subject in B.Pharm 1st semester. It covers Python fundamentals, data structures, file handling, and pharmaceutical data analysis across 5 units.',
  },
  {
    q: 'Is the Python for Pharmacists book free to download?',
    a: 'Yes. The complete Python for Pharmacists book (all 5 units, revised edition) is 100% free to download from learn.biodockify.com in both PDF and DOCX formats. It also includes a free interactive video course with AI narration.',
  },
  {
    q: 'How many units are in B Pharmacy Python (BP-101T)?',
    a: 'BP-101T has 5 units: (1) Introduction to Python, (2) Functions & Strings, (3) Data Structures, (4) File Handling & Exceptions, (5) NumPy, Pandas & Visualization. Each unit includes pharmaceutical examples and case studies.',
  },
  {
    q: 'Are these notes enough to pass B Pharmacy Python exam?',
    a: 'These handwritten notes by Dr. Tajuddin cover the entire PCI syllabus with exam-oriented summaries, code examples, and pharmaceutical applications. Pair them with the free interactive video course on BioDockify Learn for complete preparation.',
  },
];

function UnitCard({ unit }: { unit: (typeof UNITS)[number] }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold text-xl flex items-center justify-center flex-shrink-0">
            {unit.n}
          </div>
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-white leading-snug">
              {unit.title}
            </h3>
            <p className="text-sm text-neutral-500 mt-1">{unit.keywords}</p>
          </div>
        </div>
        <a
          href={unit.pdf}
          download
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold whitespace-nowrap flex-shrink-0"
        >
          <Download className="w-4 h-4" /> PDF
        </a>
      </div>
    </div>
  );
}

export default function BPharmacyPythonNotesPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Book',
        name: 'Python for Pharmacists — BP-101T Complete Notes (All 5 Units)',
        author: { '@type': 'Person', name: 'Dr. Tajuddin' },
        publisher: { '@type': 'Organization', name: 'BioDockify Learn' },
        bookFormat: 'https://schema.org/EBook',
        educationalLevel: 'Undergraduate (B.Pharm 1st Semester)',
        about: 'Python programming for pharmaceutical sciences, PCI syllabus BP-101T',
        isAccessibleForFree: true,
        url: 'https://learn.biodockify.com/b-pharmacy-python-notes',
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@type': 'Course',
        name: 'Basics of Python Programming for Pharmaceutical Sciences (BP-101T)',
        description:
          'Free B.Pharmacy Python notes and complete book PDF covering all 5 units of the PCI syllabus.',
        provider: { '@type': 'Organization', name: 'BioDockify Learn' },
        isAccessibleForFree: true,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-14 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <span className="text-xs font-mono bg-white/20 px-3 py-1 rounded-full">BP-101T</span>
            <span className="text-xs bg-amber-400 text-amber-950 px-3 py-1 rounded-full font-bold">
              FREE PDF DOWNLOAD
            </span>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full">PCI Syllabus · All 5 Units</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
            B Pharmacy Python Notes — Free PDF Download
          </h1>
          <p className="text-lg md:text-xl text-emerald-100 max-w-3xl mx-auto mb-8">
            Complete Python for Pharmaceutical Sciences notes (BP-101T) for B.Pharm 1st semester.
            All 5 units + full book. Written by Dr. Tajuddin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/notes/python-for-pharmacists-complete-book.pdf"
              download="Python-for-Pharmacists-BP101T-Complete-Book.pdf"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-emerald-700 rounded-xl hover:bg-emerald-50 transition-all text-base font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <Download className="w-5 h-5" />
              Download Complete Book (Free PDF)
            </a>
            <Link
              href="/notes"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/15 text-white rounded-xl hover:bg-white/25 transition-all text-base font-semibold backdrop-blur"
            >
              <BookOpen className="w-5 h-5" />
              Read Notes Online
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-emerald-200">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> No signup needed
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> PDF + DOCX
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 100% free forever
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Trust indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: FileText, label: '5 Complete Units', sub: 'Full PCI syllabus' },
            { icon: Download, label: 'Instant Download', sub: 'PDF + editable DOCX' },
            { icon: Star, label: 'Exam-Focused', sub: 'By Dr. Tajuddin' },
            { icon: GraduationCap, label: 'Video Course', sub: 'Free interactive lessons' },
          ].map(({ icon: Icon, label, sub }) => (
            <div
              key={label}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 text-center"
            >
              <Icon className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
              <p className="font-semibold text-neutral-900 dark:text-white text-sm">{label}</p>
              <p className="text-xs text-neutral-500">{sub}</p>
            </div>
          ))}
        </div>

        {/* Unit downloads */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Download B Pharmacy Python Notes — Unit Wise
          </h2>
          <p className="text-neutral-500 mb-6">
            Each unit of BP-101T (Basics of Python Programming for Pharmaceutical Sciences) as a
            separate free PDF, following the exact PCI B.Pharm 1st semester syllabus.
          </p>
          <div className="space-y-4">
            {UNITS.map((u) => (
              <UnitCard key={u.n} unit={u} />
            ))}
          </div>
        </section>

        {/* Complete book CTA */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white text-center">
            <Library className="w-12 h-12 mx-auto mb-3 text-white/90" />
            <h2 className="text-2xl font-bold mb-2">
              Python for Pharmacists — Complete Book (All 5 Units Combined)
            </h2>
            <p className="text-emerald-100 max-w-2xl mx-auto mb-6">
              The full revised edition with every unit, code examples, pharmaceutical case studies
              and exam tips — one single free PDF for the entire BP-101T course.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <a
                href="/notes/python-for-pharmacists-complete-book.pdf"
                download
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-emerald-700 rounded-lg font-bold hover:bg-emerald-50 transition-colors"
              >
                <Download className="w-4 h-4" /> Free PDF (2.4 MB)
              </a>
              <a
                href="/notes/python-for-pharmacists-complete-book.docx"
                download
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/15 text-white rounded-lg font-semibold hover:bg-white/25 transition-colors"
              >
                <FileText className="w-4 h-4" /> DOCX (editable)
              </a>
            </div>
          </div>
        </section>

        {/* Why these notes */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
            Why Students Use These B.Pharm Python Notes
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              'Covers 100% of the PCI BP-101T syllabus — nothing extra, nothing missing',
              'Every concept explained with a pharmaceutical example (drug data, dosage, patient records)',
              'Handwritten-style summaries ideal for last-minute exam revision',
              'Python code snippets you can run — pairs with the free interactive course',
              'Written by a pharmacy educator, reviewed against the latest PCI curriculum',
              'Free forever — no email, no login, no watermark',
            ].map((point) => (
              <div key={point} className="flex items-start gap-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{point}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 group"
              >
                <summary className="flex items-center justify-between cursor-pointer font-semibold text-neutral-900 dark:text-white text-sm md:text-base list-none">
                  {f.q}
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-open:rotate-90 transition-transform flex-shrink-0 ml-2" />
                </summary>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-3 leading-relaxed">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Video course CTA */}
        <section>
          <Link
            href="/courses"
            className="block bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-8 text-center hover:shadow-lg transition-shadow"
          >
            <Search className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
              Learn Python Visually — Free Video Course with AI Teacher
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto mb-4">
              44 interactive Python lessons with English narration, quizzes and certificates —
              free on BioDockify Learn. Pairs perfectly with these notes.
            </p>
            <span className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold text-sm">
              <GraduationCap className="w-4 h-4" /> Start Learning Free
            </span>
          </Link>
        </section>
      </div>
    </div>
  );
}
