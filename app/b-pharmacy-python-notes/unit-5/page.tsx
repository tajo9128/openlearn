import { UnitNotesPage } from '@/components/learning/unit-notes-page';

export const metadata = {
  title: 'Unit 5 Python Notes B Pharmacy PDF | BP-101T NumPy, Pandas and Visualization',
  description: 'Free Unit 5 Python notes for B.Pharm 1st semester (BP-101T PCI syllabus): NumPy, Pandas and Data Visualization. Complete syllabus topics, exam focus and pharmaceutical examples. PDF download.',
  alternates: { canonical: 'https://learn.biodockify.com/b-pharmacy-python-notes/unit-5' },
  openGraph: {
    title: 'Unit 5 Python Notes B Pharmacy PDF | BP-101T NumPy, Pandas and Visualization',
    description: 'Free BP-101T Unit 5 notes PDF - PCI syllabus, exam focus included.',
  },
};

export default function Unit5Page() {
  return <UnitNotesPage unit={5} />;
}
