import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Pharmaceutical Courses Online — AI Video Lessons & Certificates | BioDockify',
  description:
    'Learn pharma research free: Python programming, molecular docking, drug discovery, pharmacology and AI — interactive AI-narrated video courses with quizzes and free certificates for pharmacy students.',
  keywords: [
    'free pharmaceutical courses',
    'pharmacy courses online free',
    'python for pharmacy',
    'molecular docking course',
    'drug discovery course free',
    'AI in pharmacy course',
    'pharmacology online course',
    'B Pharmacy online courses',
  ],
  alternates: { canonical: 'https://learn.biodockify.com/courses' },
  openGraph: {
    title: 'Free Pharmaceutical Courses — AI-Narrated Video Lessons | BioDockify Learn',
    description:
      '21 free courses: Python for pharmacy, molecular docking, drug discovery, pharmacology, AI. Interactive video lessons with certificates.',
    url: 'https://learn.biodockify.com/courses',
    type: 'website',
  },
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
