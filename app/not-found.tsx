import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white">
      <div className="text-center px-6">
        <h1 className="text-8xl font-bold text-emerald-400 mb-4">404</h1>
        <p className="text-xl text-slate-300 mb-8">Page not found</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
