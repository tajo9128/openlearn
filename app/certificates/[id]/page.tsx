'use client';
import { getUserId } from '@/lib/learning/get-user-id';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Award, Calendar, Hash, ShieldCheck } from 'lucide-react';

export default function CertificatePage() {
  const { id } = useParams();
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    // Public verification: fetch by certificate id directly
    fetch(`/api/learning/certificates?id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        const cert = d.certificates?.[0] ?? null;
        setCertificate(cert);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <p className="text-neutral-500">Certificate not found</p>
      </div>
    );
  }

  const course = certificate.learning_courses;
  const studentName = certificate.metadata?.student_name ?? 'BioDockify Student';
  const issuedDate = new Date(certificate.issued_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4 print:bg-white">
      {/* Certificate card */}
      <div
        className="relative w-full max-w-3xl bg-white shadow-2xl print:shadow-none"
        style={{ aspectRatio: '1.414/1' }}
      >
        {/* Outer border */}
        <div className="absolute inset-3 border-2 border-emerald-700 rounded-sm pointer-events-none" />
        {/* Inner border */}
        <div className="absolute inset-5 border border-emerald-500/50 rounded-sm pointer-events-none" />
        {/* Corner ornaments */}
        <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-emerald-600 pointer-events-none" />
        <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-emerald-600 pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-emerald-600 pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-emerald-600 pointer-events-none" />

        <div className="relative h-full flex flex-col items-center justify-between px-10 py-8 text-center">
          {/* Header: logo + title */}
          <div className="flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-biodockify.svg"
              alt="BioDockify"
              className="h-10 md:h-12 mb-2"
            />
            <h1 className="text-xl md:text-3xl font-serif font-bold tracking-[0.25em] text-emerald-800 uppercase">
              Certificate
            </h1>
            <h2 className="text-xs md:text-sm font-sans font-medium tracking-[0.35em] text-neutral-500 uppercase mt-0.5">
              of Completion
            </h2>
            <div className="w-24 h-0.5 bg-emerald-600 mt-3" />
          </div>

          {/* Body */}
          <div className="flex flex-col items-center">
            <p className="text-neutral-500 text-xs md:text-sm mb-1">This is to certify that</p>
            <p className="text-2xl md:text-4xl font-serif italic text-neutral-900 mb-3 leading-tight">
              {studentName}
            </p>
            <p className="text-neutral-500 text-xs md:text-sm mb-1">has successfully completed the course</p>
            <p className="text-lg md:text-2xl font-semibold text-emerald-700 mb-4 leading-snug max-w-xl">
              {course?.title ?? 'Course'}
            </p>

            {/* Metadata row */}
            <div className="flex items-center gap-8 text-[10px] md:text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                {issuedDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-emerald-600" />
                {certificate.certificate_number}
              </span>
            </div>
          </div>

          {/* Footer: signature + seal */}
          <div className="w-full flex items-end justify-between px-6">
            {/* Signature */}
            <div className="flex flex-col items-center min-w-[160px]">
              <div className="w-40 border-b border-neutral-400 mb-1" />
              <p className="text-[10px] md:text-xs text-neutral-600 font-medium">BioDockify Learn</p>
              <p className="text-[9px] md:text-[10px] text-neutral-400">Authorized Signature</p>
            </div>

            {/* Center seal -->
            <div className="flex flex-col items-center -mt-2">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg ring-4 ring-emerald-100">
                <Award className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <p className="text-[9px] md:text-[10px] text-emerald-700 font-semibold mt-1 tracking-wider">
                VERIFIED
              </p>
            </div>

            {/* Verification */}
            <div className="flex flex-col items-center min-w-[160px]">
              <div className="w-40 border-b border-neutral-400 mb-1" />
              <p className="text-[10px] md:text-xs text-neutral-600 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Verify at learn.biodockify.com/certificates
              </p>
              <p className="text-[9px] md:text-[10px] text-neutral-400">Certificate ID: {String(certificate.id).slice(0, 8)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print button */}
      <div className="flex justify-center mt-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <Award className="w-4 h-4" />
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
