'use client';

import { useState, useEffect } from 'react';
import { Brain, Sparkles, Calendar, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { BrainRecommendation } from '@/components/brain/BrainRecommendation';
import type { BrainRecommendation as RecType, StudyPlan, KnowledgeGapResponse } from '@/lib/brain/brain-types';

export default function BrainPage() {
  const [recommendations, setRecommendations] = useState<RecType[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [gaps, setGaps] = useState<KnowledgeGapResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [gapsLoading, setGapsLoading] = useState(false);
  const userId = typeof window !== 'undefined' ? localStorage.getItem('biodockify_user_id') ?? 'demo-user' : 'demo-user';

  /**
   * Read model/key from OpenMAIC settings store (localStorage) for BYOK.
   * The settings store persists to localStorage under key 'openmaic-settings'.
   */
  function getModelHeaders(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('openmaic-settings');
      if (!raw) return {};
      const settings = JSON.parse(raw);
      const state = settings?.state;
      if (!state) return {};

      const providerId = state.providerId;
      const modelId = state.modelId;
      const providers = state.providersConfig;
      const provider = providers?.[providerId];

      if (!providerId || !modelId) return {};

      const headers: Record<string, string> = {};
      // Build model string: "provider:model"
      headers['x-model'] = providerId + ':' + modelId;
      if (provider?.apiKey) headers['x-api-key'] = provider.apiKey;
      if (provider?.baseUrl) headers['x-base-url'] = provider.baseUrl;
      headers['x-provider-type'] = providerId;

      return headers;
    } catch {
      return {};
    }
  }

  async function brainFetch(url: string, options?: RequestInit) {
    const headers = getModelHeaders();
    return fetch(url, {
      ...options,
      headers: { ...headers, ...(options?.headers ?? {}) },
    });
  }

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const res = await brainFetch(`/api/brain/recommend?user_id=${userId}`);
      const data = await res.json();
      if (data.success) {
        setRecommendations(data.recommendations ?? []);
        setSummary(data.summary ?? '');
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRecommendations();
  }, [userId]);

  const generatePlan = async () => {
    setPlanLoading(true);
    try {
      // Use first enrolled course or default pharmacology course
      const courseId = 'a1111111-1111-1111-1111-111111111111';
      const res = await brainFetch(`/api/brain/study-plan?user_id=${userId}&course_id=${courseId}&days=7`);
      const data = await res.json();
      if (data.success) setStudyPlan(data.plan);
    } catch (e) {
      console.error(e);
    }
    setPlanLoading(false);
  };

  const findGaps = async () => {
    setGapsLoading(true);
    try {
      const courseId = 'a1111111-1111-1111-1111-111111111111';
      const res = await brainFetch(`/api/brain/gaps?user_id=${userId}&course_id=${courseId}`);
      const data = await res.json();
      if (data.success) setGaps(data);
    } catch (e) {
      console.error(e);
    }
    setGapsLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">BioDockify Brain</h1>
              <p className="text-emerald-100">Your AI Learning Advisor</p>
            </div>
          </div>
          {summary && (
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 mt-4">
              <p className="text-sm">{summary}</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Recommendations */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-white">
              <Sparkles className="w-5 h-5 text-emerald-500" /> Next Best Action
            </h2>
            <button
              onClick={loadRecommendations}
              disabled={loading}
              className="flex items-center gap-1 text-sm text-emerald-600 hover:underline"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <span className="ml-3 text-neutral-500">Brain is analyzing your progress...</span>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 rounded-xl p-8 border border-neutral-200 dark:border-neutral-800 text-center text-neutral-500">
              No recommendations yet. Enroll in a course to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <BrainRecommendation key={i} rec={rec} />
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={generatePlan}
              disabled={planLoading}
              className="flex items-center gap-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 hover:shadow-md hover:border-emerald-300 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                {planLoading ? <Loader2 className="w-6 h-6 text-blue-600 animate-spin" /> : <Calendar className="w-6 h-6 text-blue-600" />}
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">Generate Study Plan</h3>
                <p className="text-sm text-neutral-500">Get a 7-day personalized plan for Pharmacology</p>
              </div>
            </button>

            <button
              onClick={findGaps}
              disabled={gapsLoading}
              className="flex items-center gap-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 hover:shadow-md hover:border-emerald-300 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                {gapsLoading ? <Loader2 className="w-6 h-6 text-amber-600 animate-spin" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white">Find Knowledge Gaps</h3>
                <p className="text-sm text-neutral-500">Identify areas that need more study</p>
              </div>
            </button>
          </div>
        </section>

        {/* Study Plan Results */}
        {studyPlan && (
          <section>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
              Study Plan: {studyPlan.courseTitle}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studyPlan.days.map((day, i) => (
                <div key={i} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-center font-bold">
                      {day.dayNumber}
                    </span>
                    <span className="text-xs text-neutral-400">{day.estimatedMinutes} min</span>
                  </div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">{day.title}</h3>
                  <ul className="space-y-1">
                    {day.lessonTitles.map((title, j) => (
                      <li key={j} className="text-sm text-neutral-600 dark:text-neutral-400 flex items-start gap-1">
                        <span className="text-emerald-500 mt-0.5">•</span> {title}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-400 italic">
                    {day.goal}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Knowledge Gaps Results */}
        {gaps && (
          <section>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Knowledge Gaps</h2>
            <p className="text-sm text-neutral-500 mb-4">{gaps.overallAssessment}</p>
            {gaps.gaps.length === 0 ? (
              <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 text-center text-neutral-500">
                No significant gaps found. Great work!
              </div>
            ) : (
              <div className="space-y-3">
                {gaps.gaps.map((gap, i) => (
                  <div key={i} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-neutral-900 dark:text-white">{gap.topic}</h3>
                      <span className={`text-sm font-bold ${gap.score < 60 ? 'text-red-500' : gap.score < 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {gap.score}%
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{gap.suggestion}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
