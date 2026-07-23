'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Square, Loader2, FileCode, Terminal, ChevronDown, FlaskConical } from 'lucide-react';
import { CodeEditor } from '@/components/workspace/CodeEditor';
import { OutputPanel, type OutputLine, type FigureData } from '@/components/workspace/OutputPanel';
import { PyodideRunner, type PyodideStatus } from '@/components/workspace/PyodideRunner';
import { TEMPLATES } from '@/lib/workspace/templates';

export default function WorkspacePage() {
  const [code, setCode] = useState(TEMPLATES[0].code);
  const [outputLines, setOutputLines] = useState<OutputLine[]>([]);
  const [figures, setFigures] = useState<FigureData[]>([]);
  const [status, setStatus] = useState<PyodideStatus>('idle');
  const [showTemplates, setShowTemplates] = useState(false);
  const [loadedPackages, setLoadedPackages] = useState<Set<string>>(new Set());
  const runnerRef = useRef<PyodideRunner | null>(null);
  const lineIdRef = useRef(0);

  const isRunning = status === 'running' || status === 'loading';

  const addOutput = useCallback((stream: 'stdout' | 'stderr', text: string) => {
    setOutputLines((prev) => [
      ...prev,
      { id: 'line-' + (lineIdRef.current++), stream, text },
    ]);
  }, []);

  // Initialize Pyodide runner on mount
  useEffect(() => {
    const runner = new PyodideRunner();
    runnerRef.current = runner;

    runner.onStatus = (state) => {
      setStatus(state);
      if (state === 'loading') {
        addOutput('stdout', '[Loading Pyodide runtime... this may take 10-20 seconds on first load]\n');
      } else if (state === 'ready') {
        addOutput('stdout', '[Pyodide ready. Python ' + '3.12' + ' loaded.]\n');
      }
    };

    runner.onOutput = (stream, text) => {
      addOutput(stream, text);
      // Track loaded packages
      const match = text.match(/\[Loaded: (.+?)\]/);
      if (match) {
        setLoadedPackages((prev) => new Set([...prev, match[1]]));
      }
    };

    runner.onFigure = (base64) => {
      setFigures((prev) => [
        ...prev,
        { id: 'fig-' + Date.now(), base64 },
      ]);
    };

    runner.onError = (message) => {
      setOutputLines((prev) => [
        ...prev,
        { id: 'line-' + (lineIdRef.current++), stream: 'error', text: message },
      ]);
    };

    runner.onDone = () => {
      // Execution finished
    };

    // Start loading Pyodide immediately
    runner.init();

    return () => {
      runner.terminate();
    };
  }, [addOutput]);

  const handleRun = () => {
    if (!runnerRef.current || isRunning) return;
    // Clear previous figures
    setFigures([]);
    // Detect packages from current template
    const currentTemplate = TEMPLATES.find((t) => t.code === code);
    const packages = currentTemplate?.packages ?? [];
    runnerRef.current.runCode(code, packages);
  };

  const loadTemplate = (templateId: string) => {
    const tmpl = TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setCode(tmpl.code);
      setShowTemplates(false);
    }
  };

  const handleClear = () => {
    setOutputLines([]);
    setFigures([]);
  };

  return (
    <div className="h-screen flex flex-col bg-[#0d1117]">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-neutral-200">BioDockify Workspace</span>
          {/* Package badges */}
          {loadedPackages.size > 0 && (
            <div className="flex items-center gap-1 ml-2">
              {Array.from(loadedPackages).map((pkg) => (
                <span key={pkg} className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-400 border border-emerald-800">
                  {pkg}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Template selector */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <FileCode className="w-4 h-4" />
              Templates
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-[#1c2128] border border-neutral-700 rounded-lg shadow-xl z-50 overflow-hidden">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => loadTemplate(tmpl.id)}
                    className="w-full text-left px-4 py-3 hover:bg-neutral-800 transition-colors border-b border-neutral-800 last:border-0"
                  >
                    <div className="font-medium text-sm text-neutral-200">{tmpl.title}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{tmpl.description}</div>
                    {tmpl.packages.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {tmpl.packages.map((p) => (
                          <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-400">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={isRunning || status === 'idle'}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </>
            ) : status === 'running' ? (
              <>
                <Square className="w-4 h-4" /> Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Run
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status bar */}
      {status === 'loading' && (
        <div className="px-4 py-1 bg-amber-900/30 border-b border-amber-800 text-amber-300 text-xs">
          Loading Pyodide runtime (~10MB). First load may take 15-30 seconds...
        </div>
      )}

      {/* Main content: editor + output */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-[#161b22] border-b border-neutral-800">
            <FileCode className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-xs text-neutral-500">main.py</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <CodeEditor value={code} onChange={setCode} />
          </div>
        </div>

        {/* Output panel */}
        <div className="w-[40%] min-w-[300px] max-w-[600px]">
          <OutputPanel
            lines={outputLines}
            figures={figures}
            isRunning={status === 'running'}
            onClear={handleClear}
          />
        </div>
      </div>
    </div>
  );
}
