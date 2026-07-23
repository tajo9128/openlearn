'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Award, Calendar, Hash } from 'lucide-react';

export default function CertificatePage() {
  const { id } = useParams();
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const userId =
      localStorage.getItem('biodockify_user_id') ?? 'demo-user';
    fetch(`/api/learning/certificates?user_id=${userId}`)
      .then((r) => r.json())
      .then((d) => {
        const cert = d.certificates?.find((c: any) => c.id === id);
        setCertificate(cert);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <p className="text-neutral-500">Certificate not found</p>
      </div>
    );
  }

  const course = certificate.learning_courses;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4">
              <Award className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Certificate of Completion</h1>
            <p className="text-emerald-100 text-sm">BioDockify Learn</p>
          </div>

          {/* Body */}
          <div className="p-8 text-center">
            <p className="text-neutral-500 text-sm mb-2">This certifies that</p>
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">
              {certificate.metadata?.student_name ?? 'BioDockify Student'}
            </h2>
            <p className="text-neutral-500 text-sm mb-2">has successfully completed</p>
            <h3 className="text-xl font-semibold text-emerald-700 mb-6">
              {course?.title ?? 'Course'}
            </h3>

            <div className="flex items-center justify-center gap-8 text-sm text-neutral-500 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(certificate.issued_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                {certificate.certificate_number}
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-6">
              <div className="w-32 border-b border-neutral-300 mx-auto mb-1" />
              <p className="text-xs text-neutral-400">BioDockify Learn</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={() => window.print()}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            Print Certificate
          </button>
        </div>
      </div>
    </div>
  );
}
