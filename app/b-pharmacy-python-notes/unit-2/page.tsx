import { UnitNotesPage } from '@/components/learning/unit-notes-page';

export const metadata = {
  title: 'Unit 2 Python Notes B Pharmacy PDF | BP-101T Functions, Modules and Strings',
  description: 'Free Unit 2 Python notes for B.Pharm 1st semester (BP-101T PCI syllabus): Functions, Modules and Strings. Complete syllabus topics, exam focus and pharmaceutical examples. PDF download.',
  alternates: { canonical: 'https://learn.biodockify.com/b-pharmacy-python-notes/unit-2' },
  openGraph: {
    title: 'Unit 2 Python Notes B Pharmacy PDF | BP-101T Functions, Modules and Strings',
    description: 'Free BP-101T Unit 2 notes PDF - PCI syllabus, exam focus included.',
  },
};

export default function Unit2Page() {
  return <UnitNotesPage unit={2} />;
}
