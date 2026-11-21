import { UnitNotesPage } from '@/components/learning/unit-notes-page';

export const metadata = {
  title: 'Unit 1 Python Notes B Pharmacy PDF Free Download | BP-101T Introduction',
  description:
    'Free Unit 1 Python notes for B.Pharm 1st semester (BP-101T PCI syllabus): Introduction to Python & Pharmaceutical Applications. Complete syllabus topics, exam focus and pharmaceutical examples. PDF download.',
  alternates: { canonical: 'https://learn.biodockify.com/b-pharmacy-python-notes/unit-1' },
  openGraph: {
    title: 'Unit 1 Python Notes B Pharmacy PDF — BP-101T Introduction',
    description:
      'Free BP-101T Unit 1 notes PDF — Introduction to Python & Pharmaceutical Applications. PCI syllabus, exam focus included.',
  },
};

export default function Unit1Page() {
  return <UnitNotesPage unit={1} />;
}
