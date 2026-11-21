import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Study Tutor for Pharmacy Students — Ask Questions, Get Answers | BioDockify',
  description:
    'BioDockify Brain: an AI tutor that answers pharmacology, drug discovery and Python questions using your course content. Free for pharmacy students.',
  alternates: { canonical: 'https://learn.biodockify.com/brain' },
};

export default function BrainLayout({ children }: { children: React.ReactNode }) {
  return children;
}
