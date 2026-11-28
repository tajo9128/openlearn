'use client';
import { getUserId } from '@/lib/learning/get-user-id';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

const SIGNATORIES = [
  {
    name: 'B K Fatheema',
    role: 'BioDockify – Founder',
    sig: 'B K Fatheema',
    sigImg: '/cert/sig-fatheema.png',
    sigHeight: '34px',
  },
  {
    name: 'Mr. Tajuddin Shaik',
    role: 'Co-Founder & Instructor',
    sig: 'Tajuddin Shaik',
    sigImg: '/cert/sig-tajuddin.png',
    sigHeight: '34px',
  },
  {
    name: 'Dr. Mohd Afroz',
    role: 'Scientific Advisor & Instructor',
    sig: 'Mohd Afroz',
  },
];

export default function CertificatePage() {
  const { id } = useParams();
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
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
      <div className="min-h-screen bg-neutral-200 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-neutral-200 flex items-center justify-center">
        <p className="text-neutral-500">Certificate not found</p>
      </div>
    );
  }

  const course = certificate.learning_courses;
  const meta = certificate.metadata ?? {};
  const studentName = meta.student_name ?? 'BioDockify Student';
  const college = meta.college ?? '';
  const totalHours = meta.training_hours ?? (meta.total_lessons ? Math.max(10, Math.round((meta.total_lessons * 15) / 60)) : 10);
  const issuedDate = new Date(certificate.issued_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).replace(/\//g, '/');

  const courseDesc =
    `for successfully completing the ${course?.title ?? 'course'} training programme on ` +
    `BioDockify Learn, covering practical applications of Python Programming, Pharmaceutical ` +
    `Data Analysis, and Computational Research Skills with hands-on examples.`;

  return (
    <div className="min-h-screen bg-neutral-300 flex flex-col items-center justify-center p-4 print:bg-white">
      {/* Certificate card */}
      <div
        className="relative w-full max-w-4xl bg-white shadow-2xl print:shadow-none overflow-hidden"
        style={{ aspectRatio: '1.5/1', borderLeft: '10px solid #e8534a' }}
      >
        {/* Subtle dotted pattern background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: 'radial-gradient(#e2e8f0 1.2px, transparent 1.2px)',
            backgroundSize: '22px 22px',
          }}
        />
        {/* Big red circle decor right */}
        <div
          className="absolute pointer-events-none"
          style={{
            right: '-180px',
            top: '-40px',
            width: '460px',
            height: '460px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #f87171 0%, #ef4444 45%, #dc2626 100%)',
            opacity: 0.9,
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            right: '-60px',
            top: '160px',
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 40%, #fb7185 0%, #ef4444 70%)',
            opacity: 0.85,
          }}
        />

        <div className="relative h-full flex flex-col px-8 md:px-12 py-6 md:py-8">
          {/* Header row: logo left, NVIDIA badge right */}
          <div className="flex items-start justify-between">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cert/logo-new.png"
                alt="BioDockify"
                className="h-12 md:h-16 mix-blend-multiply"
              />
            </div>
            {/* NVIDIA Inception badge */}
            <div
              className="hidden md:flex items-center justify-center bg-white border border-neutral-300 rounded-lg shadow-sm overflow-hidden"
              style={{ width: '120px', height: '150px' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cert/nvidia-inception.png"
                alt="Proud to be part of NVIDIA Inception Program"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-6xl font-bold text-neutral-800 mt-4 md:mt-6 tracking-tight">
            Training Certificate
          </h1>

          {/* Awarded to */}
          <p className="text-xs md:text-sm text-neutral-500 mt-3 md:mt-4">This certificate is awarded to</p>
          <p
            className="text-2xl md:text-4xl font-bold text-neutral-800 mt-2 pb-1 border-b-2 border-neutral-300 inline-block self-start px-2 md:px-4"
            style={{ minWidth: '55%' }}
          >
            {studentName}
          </p>
          {college && (
            <p className="text-base md:text-xl text-neutral-700 mt-2">{college}</p>
          )}

          {/* Description */}
          <p className="text-xs md:text-sm text-neutral-600 mt-3 md:mt-4 leading-relaxed max-w-2xl">
            {courseDesc}
          </p>

          {/* Duration + date */}
          <div className="flex items-center gap-10 md:gap-24 mt-3 md:mt-4 text-xs md:text-sm text-neutral-500">
            <p>
              Training Duration: <span className="font-bold text-neutral-800">{totalHours} Hours</span>
            </p>
            <p>
              Issue Date:{' '}
              <span className="font-bold text-neutral-800">{issuedDate}</span>
            </p>
          </div>

          {/* Signatures */}
          <div className="mt-auto pt-4 grid grid-cols-3 gap-6 max-w-3xl items-end">
            {SIGNATORIES.map((s) => (
              <div key={s.name} className="flex flex-col items-start">
                {s.sigImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.sigImg}
                    alt={`${s.name} signature`}
                    className="mb-1 object-contain mix-blend-multiply"
                    style={{ height: s.sigHeight ?? '38px' }}
                  />
                ) : (
                  <p
                    className="text-lg md:text-2xl text-neutral-700 leading-none mb-1"
                    style={{ fontFamily: "'Segoe Script', 'Brush Script MT', 'Dancing Script', cursive" }}
                  >
                    {s.sig}
                  </p>
                )}
                <div className="w-full border-b border-neutral-400 mb-1" />
                <p className="text-[10px] md:text-sm font-bold text-neutral-800">{s.name}</p>
                <p className="text-[9px] md:text-xs text-neutral-500">{s.role}</p>
              </div>
            ))}
          </div>

          {/* Verification strip */}
          <div className="mt-auto pt-2 flex items-center justify-between text-[9px] md:text-[10px] text-neutral-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Verify: learn.biodockify.com/certificates/{String(certificate.id).slice(0, 8)}
            </span>
            <span>Cert No: {certificate.certificate_number}</span>
          </div>
        </div>
      </div>

      {/* Print */}
      <div className="flex justify-center mt-5 print:hidden">
        <button
          onClick={() => window.print()}
          className="px-6 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium"
        >
          Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
