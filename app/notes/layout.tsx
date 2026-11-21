import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'B Pharmacy Python Notes — Read All 5 Units Online Free (BP-101T) | BioDockify',
  description:
    'Read Python for Pharmaceutical Sciences notes (BP-101T) online unit-wise — all 5 units free with downloadable PDFs, PCI syllabus aligned. By Dr. Tajuddin.',
  alternates: { canonical: 'https://learn.biodockify.com/notes' },
};

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
