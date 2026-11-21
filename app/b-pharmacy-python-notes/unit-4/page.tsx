import { UnitNotesPage } from '@/components/learning/unit-notes-page';

export const metadata = {
  title: 'Unit 4 Python Notes B Pharmacy PDF | BP-101T File Handling and Exceptions',
  description: 'Free Unit 4 Python notes for B.Pharm 1st semester (BP-101T PCI syllabus): File Handling, Exceptions and Libraries. Complete syllabus topics, exam focus and pharmaceutical examples. PDF download.',
  alternates: { canonical: 'https://learn.biodockify.com/b-pharmacy-python-notes/unit-4' },
  openGraph: {
    title: 'Unit 4 Python Notes B Pharmacy PDF | BP-101T File Handling and Exceptions',
    description: 'Free BP-101T Unit 4 notes PDF - PCI syllabus, exam focus included.',
  },
};

export default function Unit4Page() {
  return <UnitNotesPage unit={4} />;
}
