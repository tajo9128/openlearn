import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Python GitHub Repositories for Pharmacy Students | BioDockify Learn',
  description:
    '36 curated GitHub repositories for B.Pharm students learning Python — Biopython, RDKit, Scanpy, pandas, NumPy, FastAPI and more. Practice code alongside your coursework.',
  alternates: { canonical: 'https://learn.biodockify.com/github' },
};

export default function GithubLayout({ children }: { children: React.ReactNode }) {
  return children;
}
