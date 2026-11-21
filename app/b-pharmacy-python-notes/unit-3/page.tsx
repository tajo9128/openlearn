import { UnitNotesPage } from '@/components/learning/unit-notes-page';

export const metadata = {
  title: 'Unit 3 Python Notes B Pharmacy PDF | BP-101T Lists, Tuples, Dicts',
  description: 'Free Unit 3 Python notes for B.Pharm 1st semester (BP-101T PCI syllabus): Data Structures - Lists, Tuples, Sets and Dictionaries. Complete syllabus topics, exam focus and pharmaceutical examples. PDF download.',
  alternates: { canonical: 'https://learn.biodockify.com/b-pharmacy-python-notes/unit-3' },
  openGraph: {
    title: 'Unit 3 Python Notes B Pharmacy PDF | BP-101T Lists, Tuples, Dicts',
    description: 'Free BP-101T Unit 3 notes PDF - PCI syllabus, exam focus included.',
  },
};

export default function Unit3Page() {
  return <UnitNotesPage unit={3} />;
}
