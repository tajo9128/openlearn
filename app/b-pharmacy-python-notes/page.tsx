import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Download, FileText, CheckCircle2, GraduationCap, BookOpen,
  ChevronRight, Star, Search, Library, ArrowRight, MousePointerClick,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'B Pharmacy Python Notes PDF Free Download | BP-101T Complete Book (All 5 Units)',
  description:
    'Free B.Pharmacy Python notes PDF download (BP-101T) — PCI syllabus, all 5 units. Python for Pharmaceutical Sciences complete book free PDF + DOCX. Notes by Dr. Tajuddin. Get the free Python book for B.Pharm 1st semester.',
  keywords: [
    'b pharmacy python notes',
    'b pharm python notes pdf',
    'BP-101T python notes',
    'BP 101T notes pdf free download',
    'python for pharmacists pdf free download',
    'b pharmacy 1st semester python notes',
    'b pharmacy 1st year python notes',
    'python book for pharmacy students pdf',
    'b pharm python free book pdf',
    'basics of python programming for pharmaceutical sciences notes',
    'pci syllabus python notes',
    'b pharmacy python question bank',
    'python programming in pharmacy notes unit wise',
    'unit 1 python notes b pharmacy',
    'unit 5 python notes b pharmacy numpy pandas',
    'free python notes for pharmacy students',
  ],
  openGraph: {
    title: 'B Pharmacy Python Notes PDF — Free Complete Book (All 5 Units)',
    description:
      'BP-101T Python for Pharmaceutical Sciences: free handwritten notes covering all 5 units per PCI syllabus. Instant PDF download.',
    type: 'website',
    url: 'https://learn.biodockify.com/b-pharmacy-python-notes',
    siteName: 'BioDockify Learn',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'B Pharmacy Python Notes — Free PDF (All 5 Units, BP-101T)',
    description: 'Complete Python for Pharmaceutical Sciences notes free download.',
  },
  alternates: { canonical: 'https://learn.biodockify.com/b-pharmacy-python-notes' },
};

const UNITS = [
  {
    n: 1,
    title: 'Unit 1: Introduction to Python & Pharmaceutical Applications',
    keywords: 'Python basics, variables, data types, operators, control statements',
    syllabus: [
      'Introduction to Python: history, features, applications in pharmacy',
      'Installation of Python and IDE (IDLE, VS Code, Jupyter)',
      'Variables, naming rules and data types (int, float, string, boolean)',
      'Operators: arithmetic, relational, logical, assignment',
      'Input and output statements — input(), print(), f-strings',
      'Control statements: if, if-else, nested if, for loop, while loop',
      'Break, continue and pass statements',
    ],
    pdf: '/notes/unit-1-python-for-pharmacists.pdf',
    docx: '/notes/unit-1-python-for-pharmacists.docx',
  },
  {
    n: 2,
    title: 'Unit 2: Functions, Modules & Strings',
    keywords: 'Python functions, modules, string methods, pharmaceutical examples',
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
    pdf: '/notes/unit-2-python-for-pharmacists.pdf',
    docx: '/notes/unit-2-python-for-pharmacists.docx',
  },
  {
    n: 3,
    title: 'Unit 3: Data Structures — Lists, Tuples, Sets & Dictionaries',
    keywords: 'Python lists, tuples, sets, dictionaries, drug data management',
    syllabus: [
      'Lists: creation, indexing, slicing, methods (append, insert, remove, sort)',
      'List comprehensions',
      'Tuples: creation, packing, unpacking, immutability',
      'Sets: creation, add, remove, set operations (union, intersection)',
      'Dictionaries: creation, accessing, adding, updating key-value pairs',
      'Nested data structures for patient and drug records',
      'Pharmaceutical examples: storing drug inventories and dosage data',
    ],
    pdf: '/notes/unit-3-python-for-pharmacists.pdf',
    docx: '/notes/unit-3-python-for-pharmacists.docx',
  },
  {
    n: 4,
    title: 'Unit 4: File Handling, Exceptions & Libraries',
    keywords: 'Python file handling, CSV, exception handling, pharmaceutical libraries',
    syllabus: [
      'File handling: opening, reading, writing and closing files',
      'File modes (r, w, a) and working with CSV files',
      'The with statement and file object methods',
      'Exception handling: try, except, else, finally',
      'Built-in exceptions and raising custom exceptions',
      'Overview of important Python libraries for pharmacy',
      'Best practices for processing laboratory and clinical data',
    ],
    pdf: '/notes/unit-4-python-for-pharmacists.pdf',
    docx: '/notes/unit-4-python-for-pharmacists.docx',
  },
  {
    n: 5,
    title: 'Unit 5: NumPy, Pandas & Data Visualization',
    keywords: 'NumPy arrays, Pandas DataFrame, Matplotlib, dose-response analysis',
    syllabus: [
      'NumPy: arrays, array creation, indexing, slicing, operations',
      'Mathematical and statistical functions in NumPy',
      'Pandas: Series and DataFrame, reading CSV/Excel data',
      'Data selection, filtering, sorting and grouping',
      'Matplotlib: line plots, bar charts, histograms, scatter plots',
      'Plotting dose-response curves and drug concentration data',
      'Mini case studies: pharmaceutical data analysis workflows',
    ],
    pdf: '/notes/unit-5-python-for-pharmacists.pdf',
    docx: '/notes/unit-5-python-for-pharmacists.docx',
  },
];

const FAQS = [
  {
    q: 'Where can I download B Pharmacy Python notes PDF for free?',
    a: 'You can download free B.Pharmacy Python notes (BP-101T) PDF from BioDockify Learn. All 5 units following the PCI syllabus are available as individual unit PDFs plus a complete combined book — no signup required, instant download.',
  },
  {
    q: 'What is BP-101T in B Pharmacy 1st semester?',
    a: 'BP-101T is the PCI (Pharmacy Council of India) course code for "Basics of Python Programming for Pharmaceutical Sciences" — a theory subject in B.Pharm 1st semester. It covers Python fundamentals, functions, data structures, file handling, and pharmaceutical data analysis with NumPy, Pandas and Matplotlib across 5 units.',
  },
  {
    q: 'Is the Python for Pharmacists book free to download?',
    a: 'Yes. The complete Python for Pharmacists book (all 5 units, revised edition) is 100% free to download from learn.biodockify.com in both PDF and DOCX formats. It also includes a free interactive video course with AI narration.',
  },
  {
    q: 'How many units are in B Pharmacy Python (BP-101T)?',
    a: 'BP-101T has 5 units: (1) Introduction to Python, (2) Functions, Modules & Strings, (3) Data Structures — Lists, Tuples, Sets & Dictionaries, (4) File Handling & Exceptions, (5) NumPy, Pandas & Data Visualization. Each unit includes pharmaceutical examples and case studies.',
  },
  {
    q: 'Are these notes enough to pass B Pharmacy Python exam?',
    a: 'These handwritten notes by Dr. Tajuddin cover the entire PCI syllabus with exam-oriented summaries, worked code examples, and pharmaceutical applications for every unit. Pair them with the free interactive video course on BioDockify Learn for complete preparation.',
  },
  {
    q: 'What topics are in Unit 1 of B Pharmacy Python?',
    a: 'Unit 1 of BP-101T covers: Python history and features, installation and IDEs, variables and data types, operators, input/output statements, and control statements (if-else, for loop, while loop) with pharmaceutical examples.',
  },
  {
    q: 'What is taught in Unit 5 of B Pharmacy Python (BP-101T)?',
    a: 'Unit 5 covers NumPy arrays and operations, Pandas DataFrames for reading and analysing pharmaceutical datasets, and Matplotlib for plotting dose-response curves, drug concentration graphs and other visualizations.',
  },
  {
    q: 'Do I need prior coding experience for B Pharmacy Python?',
    a: 'No prior coding experience is needed. BP-101T starts from absolute basics in Unit 1 and progresses step by step. These notes explain every concept with pharmacy-specific examples so B.Pharm students can learn Python alongside their regular coursework.',
  },
  {
    q: 'Can I get these Python notes in DOCX (editable) format?',
    a: 'Yes — every unit and the complete book are available in both PDF (for reading/printing) and DOCX (editable) formats, completely free. Click any download button on this page.',
  },
  {
    q: 'Is there a video course for B Pharmacy Python?',
    a: 'Yes. BioDockify Learn offers a free interactive Python course with 44 video lessons, English narration, quizzes and completion certificates — designed to pair with these BP-101T notes.',
  },
];

function UnitCard({ unit }: { unit: (typeof UNITS)[number] }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
      <div className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
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
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={unit.pdf}
            download={`BioDockify-Unit${unit.n}-Python-for-Pharmacists.pdf`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> PDF
          </a>
          <a
            href={unit.docx}
            download={`BioDockify-Unit${unit.n}-Python-for-Pharmacists.docx`}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-sm font-semibold whitespace-nowrap"
          >
            <FileText className="w-4 h-4" /> DOCX
          </a>
        </div>
      </div>
      <details className="border-t border-neutral-100 dark:border-neutral-800 group">
        <summary className="px-6 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 cursor-pointer list-none flex items-center gap-2">
          <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
          View complete {`Unit ${unit.n}`} syllabus topics
        </summary>
        <ul className="px-6 pb-5 pt-1 space-y-2">
          {unit.syllabus.map((topic) => (
            <li key={topic} className="flex items-start gap-2.5 text-sm text-neutral-600 dark:text-neutral-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              {topic}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export default function BPharmacyPythonNotesPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': 'https://learn.biodockify.com/b-pharmacy-python-notes#webpage',
        url: 'https://learn.biodockify.com/b-pharmacy-python-notes',
        name: 'B Pharmacy Python Notes PDF Free Download | BP-101T Complete Book',
        description: 'Free BP-101T Python for Pharmaceutical Sciences notes — all 5 units PDF + DOCX download.',
        isPartOf: { '@type': 'WebSite', name: 'BioDockify Learn', url: 'https://learn.biodockify.com' },
        primaryImageOfPage: { '@type': 'ImageObject', url: 'https://learn.biodockify.com/logo-horizontal.png' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://learn.biodockify.com' },
          { '@type': 'ListItem', position: 2, name: 'Courses', item: 'https://learn.biodockify.com/courses' },
          { '@type': 'ListItem', position: 3, name: 'B Pharmacy Python Notes (BP-101T)', item: 'https://learn.biodockify.com/b-pharmacy-python-notes' },
        ],
      },
      {
        '@type': 'Book',
        '@id': 'https://learn.biodockify.com/b-pharmacy-python-notes#book',
        name: 'Python for Pharmacists — BP-101T Complete Notes (All 5 Units)',
        author: { '@type': 'Person', name: 'Dr. Tajuddin' },
        publisher: { '@type': 'Organization', name: 'BioDockify Learn', url: 'https://learn.biodockify.com' },
        bookFormat: 'https://schema.org/EBook',
        educationalLevel: 'Undergraduate (B.Pharm 1st Semester)',
        about: 'Python programming for pharmaceutical sciences, PCI syllabus BP-101T',
        teaches: UNITS.map((u) => u.title.replace(/^Unit \d+: /, '')),
        isAccessibleForFree: true,
        url: 'https://learn.biodockify.com/b-pharmacy-python-notes',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR', availability: 'https://schema.org/InStock' },
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
          'Free B.Pharmacy Python notes and complete book PDF covering all 5 units of the PCI syllabus, with a companion interactive video course.',
        provider: { '@type': 'Organization', name: 'BioDockify Learn', url: 'https://learn.biodockify.com' },
        isAccessibleForFree: true,
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: 'online',
          courseWorkload: 'PT40H',
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <ol className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-1.5 text-xs text-neutral-500">
          <li><Link href="/" className="hover:text-emerald-600">Home</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/courses" className="hover:text-emerald-600">Courses</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-neutral-800 dark:text-neutral-200 font-medium">B Pharmacy Python Notes (BP-101T)</li>
        </ol>
      </nav>

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
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6 text-sm text-emerald-200">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> No signup needed</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> PDF + DOCX</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> 100% free forever</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> PCI syllabus aligned</span>
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
        <section className="mb-12" id="unit-wise-notes">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Download B Pharmacy Python Notes — Unit Wise
          </h2>
          <p className="text-neutral-500 mb-6">
            Each unit of BP-101T (Basics of Python Programming for Pharmaceutical Sciences) as a
            separate free PDF, following the exact PCI B.Pharm 1st semester syllabus. Expand any
            unit to see the full list of syllabus topics covered.
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

        {/* Internal links */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
            Related Free Resources on BioDockify Learn
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              href="/courses"
              className="group bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 hover:border-emerald-300 transition-colors"
            >
              <MousePointerClick className="w-6 h-6 text-emerald-600 mb-2" />
              <h3 className="font-semibold text-neutral-900 dark:text-white text-sm mb-1">
                Free Python Video Course
              </h3>
              <p className="text-xs text-neutral-500 mb-2">
                44 interactive lessons with AI narration, quizzes & certificates
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                Start free <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
            <Link
              href="/track/python-data"
              className="group bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 hover:border-emerald-300 transition-colors"
            >
              <BookOpen className="w-6 h-6 text-emerald-600 mb-2" />
              <h3 className="font-semibold text-neutral-900 dark:text-white text-sm mb-1">
                Python & Data Career Track
              </h3>
              <p className="text-xs text-neutral-500 mb-2">
                Guided path from Python basics to pharmaceutical data science
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                Explore track <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
            <Link
              href="/github"
              className="group bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 hover:border-emerald-300 transition-colors"
            >
              <Search className="w-6 h-6 text-emerald-600 mb-2" />
              <h3 className="font-semibold text-neutral-900 dark:text-white text-sm mb-1">
                Python Practice Repos
              </h3>
              <p className="text-xs text-neutral-500 mb-2">
                36 curated GitHub repositories for hands-on Python practice
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                Browse repos <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12" id="faq">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">
            Frequently Asked Questions — B Pharmacy Python Notes
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
            <GraduationCap className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
              Learn Python Visually — Free Video Course with AI Teacher
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto mb-4">
              44 interactive Python lessons with English narration, quizzes and certificates —
              free on BioDockify Learn. Pairs perfectly with these notes.
            </p>
            <span className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold text-sm">
              Start Learning Free <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </section>
      </div>
    </div>
  );
}
