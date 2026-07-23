'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Play, CheckCircle, XCircle, ArrowLeft, Loader2, Sparkles, FlaskConical, Terminal } from 'lucide-react';
import { CodeEditor } from '@/components/workspace/CodeEditor';
import { PyodideRunner, type PyodideStatus } from '@/components/workspace/PyodideRunner';
import type { CodeTestCase } from '@/lib/learning/code-scoring';

interface TestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  hidden: boolean;
}

export default function PracticePage() {
  const { id: courseId, lessonId } = useParams();
  const [exercise, setExercise] = useState<any>(null);
  const [question, setQuestion] = useState<any>(null);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<PyodideStatus>('idle');
  const [stdout, setStdout] = useState('');
  const [outputLines, setOutputLines] = useState<{ id: string; stream: string; text: string }[]>([]);
  const [testCases, setTestCases] = useState<CodeTestCase[]>([]);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [score, setScore] = useState<{ passed: number; total: number; percentage: number } | null>(null);
  const [review, setReview] = useState<{ score: number; feedback: string; suggestions: string[] } | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const runnerRef = useRef<PyodideRunner | null>(null);
  const stdoutRef = useRef('');
  const lineIdRef = useRef(0);
  const userId = typeof window !== 'undefined' ? localStorage.getItem('biodockify_user_id') ?? 'demo-user' : 'demo-user';

  // Fetch exercise data
  useEffect(() => {
    if (!lessonId) return;

    // Fetch exercises for this lesson
    fetch(`/api/learning/exercises?lesson_id=${lessonId}`)
      .then((r) => r.json())
      .then(async (d) => {
        const codingEx = (d.exercises ?? []).find((e: any) => e.exercise_type === 'coding');
        if (!codingEx) {
          setLoading(false);
          return;
        }

        setExercise(codingEx);

        // Fetch questions
        const qRes = await fetch(`/api/learning/exercises?course_id=${courseId}`);
        const qData = await qRes.json();
        // Find the code question for this exercise
        // For now, use the exercise data directly
        setQuestion({
          text: codingEx.description ?? codingEx.title,
          starterCode: '# Write your solution here\n',
        });

        // Test cases are in the exercise's questions
        const { supabaseQuery, TABLES } = await import('@/lib/learning/supabase-client');
        const { data: questions } = await supabaseQuery<any>(TABLES.EXERCISE_QUESTIONS, {
          filters: { exercise_id: `eq.${codingEx.id}` },
        });

        const codeQ = (questions ?? []).find((q: any) => q.question_type === 'code');
        if (codeQ) {
          setQuestion({
            text: codeQ.question_text,
            starterCode: codeQ.correct_answer ?? '# Write your solution here\n',
          });
          setCode(codeQ.correct_answer ?? '# Write your solution here\n');
          setTestCases(Array.isArray(codeQ.options) ? codeQ.options : []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [lessonId, courseId]);

  // Initialize Pyodide runner
  const addOutput = useCallback((stream: string, text: string) => {
    setOutputLines((prev) => [...prev, { id: 'ol-' + (lineIdRef.current++), stream, text }]);
  }, []);

  useEffect(() => {
    const runner = new PyodideRunner();
    runnerRef.current = runner;

    runner.onStatus = (state) => {
      setStatus(state);
      if (state === 'loading') addOutput('stdout', '[Loading Pyodide...]\n');
      if (state === 'ready') addOutput('stdout', '[Python ready]\n');
    };

    runner.onOutput = (stream, text) => {
      addOutput(stream, text);
      stdoutRef.current += text;
    };

    runner.onFigure = () => {};

    runner.onError = (message) => {
      addOutput('error', message);
    };

    runner.onDone = () => {};

    runner.init();

    return () => runner.terminate();
  }, [addOutput]);

  const handleRun = () => {
    if (!runnerRef.current || status === 'running' || status === 'loading') return;
    stdoutRef.current = '';
    setStdout('');
    setOutputLines([]);
    setTestResults(null);
    setScore(null);

    // Detect packages from exercise
    const packages = exercise?.tags?.includes('rdkit') ? ['rdkit'] : [];
    runnerRef.current.runCode(code, packages);
  };

  const handleSubmit = async () => {
    if (!exercise) return;
    setSubmitLoading(true);

    // Capture current stdout
    const currentStdout = stdoutRef.current.trim();

    try {
      const res = await fetch(`/api/learning/exercises/${exercise.id}/grade-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          code,
          stdout: currentStdout,
          test_cases: testCases,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setTestResults(data.testResults);
        setScore({
          passed: data.score,
          total: data.maxScore,
          percentage: data.percentage,
        });
      } else {
        addOutput('error', 'Grading failed: ' + (data.error ?? 'Unknown error'));
      }
    } catch (e) {
      addOutput('error', 'Submit failed: ' + String(e));
    }
    setSubmitLoading(false);
  };

  const handleAIReview = async () => {
    setReviewLoading(true);
    setReview(null);
    try {
      const res = await fetch('/api/brain/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          course_id: courseId,
          question: `Please review this Python code:\n\n${code}\n\nOutput:\n${stdoutRef.current}\n\nEvaluate correctness, code quality, and suggest improvements. Reply with JSON: {score: 0-100, feedback: string, suggestions: string[]}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Try to parse JSON from answer
        try {
          const cleaned = data.answer.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
          const start = cleaned.indexOf('{');
          const end = cleaned.lastIndexOf('}');
          if (start !== -1 && end !== -1) {
            setReview(JSON.parse(cleaned.substring(start, end + 1)));
          } else {
            setReview({ score: 0, feedback: data.answer, suggestions: [] });
          }
        } catch {
          setReview({ score: 0, feedback: data.answer, suggestions: [] });
        }
      }
    } catch (e) {
      console.error(e);
    }
    setReviewLoading(false);
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="h-screen bg-[#0d1117] flex flex-col items-center justify-center text-neutral-400">
        <FlaskConical className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg">No coding exercise for this lesson</p>
        <Link href={`/courses/${courseId}/lessons/${lessonId}`} className="mt-4 text-emerald-500 hover:underline">
          ← Back to lesson
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0d1117] text-neutral-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <Link href={`/courses/${courseId}/lessons/${lessonId}`} className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="font-semibold">{exercise.title}</span>
          {score && (
            <span className={`text-sm font-bold px-2 py-0.5 rounded ${score.percentage >= 80 ? 'bg-emerald-900/50 text-emerald-400' : score.percentage >= 50 ? 'bg-amber-900/50 text-amber-400' : 'bg-red-900/50 text-red-400'}`}>
              {score.passed}/{score.total} ({score.percentage}%)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={status === 'running' || status === 'loading'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
          >
            {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Submit
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: problem + tests */}
        <div className="w-[300px] min-w-[250px] border-r border-neutral-800 overflow-y-auto bg-[#0d1117]">
          {/* Problem */}
          <div className="p-4 border-b border-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-300 mb-2">Problem</h3>
            <p className="text-sm text-neutral-400">{question?.text ?? exercise.description}</p>
          </div>

          {/* Test cases */}
          <div className="p-4 border-b border-neutral-800">
            <h3 className="text-sm font-semibold text-neutral-300 mb-2">Test Cases</h3>
            {testCases.length === 0 ? (
              <p className="text-xs text-neutral-600">No test cases</p>
            ) : (
              <div className="space-y-2">
                {testCases.map((tc, i) => {
                  const result = testResults?.[i];
                  return (
                    <div key={i} className="bg-[#161b22] rounded-lg p-2.5 border border-neutral-800">
                      <div className="flex items-center gap-2">
                        {result ? (
                          result.passed ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-neutral-600" />
                        )}
                        <span className="text-xs font-medium text-neutral-300">{tc.name}</span>
                        {tc.hidden && <span className="text-[10px] text-neutral-600">hidden</span>}
                      </div>
                      {!tc.hidden && (
                        <div className="mt-1.5 text-xs">
                          <span className="text-neutral-500">Expected: </span>
                          <code className="text-blue-400">{tc.expectedOutput}</code>
                        </div>
                      )}
                      {result && !result.passed && (
                        <div className="mt-1 text-xs">
                          <span className="text-neutral-500">Got: </span>
                          <code className="text-red-400">{result.actual.substring(0, 100)}</code>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Review */}
          <div className="p-4">
            <button
              onClick={handleAIReview}
              disabled={reviewLoading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600/30 border border-purple-700 text-purple-300 rounded-lg hover:bg-purple-600/40 disabled:opacity-50 text-sm font-medium"
            >
              {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              AI Review
            </button>

            {review && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-purple-400">{review.score}</span>
                  <span className="text-xs text-neutral-500">/ 100</span>
                </div>
                <p className="text-xs text-neutral-400">{review.feedback}</p>
                {review.suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-neutral-500 mb-1">Suggestions:</p>
                    <ul className="space-y-1">
                      {review.suggestions.map((s, i) => (
                        <li key={i} className="text-xs text-neutral-400 flex items-start gap-1">
                          <span className="text-purple-400">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: code editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-[#161b22] border-b border-neutral-800">
            <Terminal className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-xs text-neutral-500">solution.py</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <CodeEditor value={code} onChange={setCode} />
          </div>
        </div>

        {/* Right: output */}
        <div className="w-[35%] min-w-[250px] max-w-[450px] bg-[#0d1117] border-l border-neutral-800 flex flex-col">
          <div className="px-4 py-2 border-b border-neutral-800 bg-[#161b22] flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-neutral-300">Output</span>
            {status === 'running' && (
              <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-sm">
            {outputLines.length === 0 ? (
              <p className="text-neutral-600 text-center py-8 text-xs">Run your code to see output</p>
            ) : (
              outputLines.map((line) => (
                <div
                  key={line.id}
                  className={
                    line.stream === 'error'
                      ? 'text-red-400 whitespace-pre-wrap break-all'
                      : line.stream === 'stderr'
                        ? 'text-yellow-400 whitespace-pre-wrap break-all'
                        : 'text-neutral-300 whitespace-pre-wrap break-all'
                  }
                >
                  {line.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
