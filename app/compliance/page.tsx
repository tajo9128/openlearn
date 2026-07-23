'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, XCircle, Users } from 'lucide-react';

export default function CompliancePage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [overviews, setOverviews] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/learning/courses')
      .then((r) => r.json())
      .then(async (d) => {
        const allCourses = d.courses ?? [];
        setCourses(allCourses);
        // Fetch compliance overview for each course that has compliance config
        const results: Record<string, any> = {};
        await Promise.all(
          allCourses.map(async (c: any) => {
            if (c.compliance) {
              try {
                const res = await fetch(`/api/learning/compliance/overview?course_id=${c.id}`);
                const data = await res.json();
                if (data.success) results[c.id] = data.overview;
              } catch {}
            }
          }),
        );
        setOverviews(results);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const complianceCourses = courses.filter((c) => c.compliance);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
            <Shield className="w-6 h-6 text-emerald-600" /> Compliance Dashboard
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Track training compliance and recertification status
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {complianceCourses.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-12 border border-neutral-200 dark:border-neutral-800 text-center">
            <Shield className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
              No compliance courses configured
            </h3>
            <p className="text-neutral-500">
              Add a compliance config to courses to enable tracking
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {complianceCourses.map((course) => {
              const ov = overviews[course.id];
              const summary = ov?.summary ?? {};
              return (
                <div key={course.id} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                  <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{course.title}</h2>
                        <p className="text-sm text-neutral-500 mt-1">
                          Framework: {course.compliance?.framework ?? 'CUSTOM'} | Recert: every {course.compliance?.retakeIntervalMonths ?? 12} months
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-neutral-900 dark:text-white">{summary.total ?? 0}</p>
                        <p className="text-xs text-neutral-500">learners tracked</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-px bg-neutral-200 dark:bg-neutral-800">
                    {[
                      { key: 'compliant', label: 'Compliant', icon: CheckCircle, color: 'emerald' },
                      { key: 'expiring_soon', label: 'Expiring', icon: Clock, color: 'amber' },
                      { key: 'in_grace_period', label: 'Grace', icon: AlertTriangle, color: 'orange' },
                      { key: 'non_compliant', label: 'Overdue', icon: XCircle, color: 'red' },
                      { key: 'in_progress', label: 'In Progress', icon: Clock, color: 'blue' },
                      { key: 'not_started', label: 'Not Started', icon: Users, color: 'neutral' },
                      { key: 'waived', label: 'Waived', icon: Shield, color: 'purple' },
                    ].map(({ key, label, icon: Icon, color }) => (
                      <div key={key} className="bg-white dark:bg-neutral-900 p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 text-${color}-500`} />
                          <span className="text-xs text-neutral-500">{label}</span>
                        </div>
                        <p className="text-2xl font-bold text-neutral-900 dark:text-white">{summary[key] ?? 0}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
