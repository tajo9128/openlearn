'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

function VerifyForm() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const type = searchParams.get('type') ?? 'email';

    if (!token) {
      setStatus('error');
      setMessage('No verification token found.');
      return;
    }

    fetch(`/api/auth/verify?token=${encodeURIComponent(token)}&type=${type}`)
      .then(async (res) => {
        if (res.redirected) {
          window.location.href = res.url;
          return;
        }
        const data = await res.json();
        if (data.success) {
          setStatus('success');
          setMessage('Email verified! Redirecting to login...');
          setTimeout(() => { window.location.href = '/auth/login?verified=true'; }, 2000);
        } else {
          setStatus('error');
          setMessage(data.error ?? 'Verification failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Connection error. Please try again.');
      });
  }, [searchParams]);

  return (
    <div className="w-full max-w-md text-center">
      <GraduationCap className="w-12 h-12 text-emerald-600 mx-auto mb-4" />

      {status === 'loading' && (
        <>
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Verifying your email...</h1>
          <p className="text-neutral-500 mt-2">Please wait</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Email Verified!</h1>
          <p className="text-neutral-500 mt-2">{message}</p>
        </>
      )}

      {status === 'error' && (
        <>
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Verification Failed</h1>
          <p className="text-neutral-500 mt-2 mb-6">{message}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/auth/signup" className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              Try Again
            </Link>
            <Link href="/auth/login" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors">
              Go to Login
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <Suspense fallback={<div className="flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>}>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
