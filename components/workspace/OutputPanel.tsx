'use client';

import { useRef, useEffect } from 'react';
import { Terminal, Image as ImageIcon, Trash2, AlertCircle } from 'lucide-react';

export interface OutputLine {
  id: string;
  stream: 'stdout' | 'stderr' | 'error';
  text: string;
}

export interface FigureData {
  id: string;
  base64: string;
}

interface OutputPanelProps {
  lines: OutputLine[];
  figures: FigureData[];
  isRunning: boolean;
  onClear: () => void;
}

export function OutputPanel({ lines, figures, isRunning, onClear }: OutputPanelProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, figures]);

  return (
    <div className="h-full flex flex-col bg-[#0d1117] border-l border-neutral-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-[#161b22]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-neutral-300">Output</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Running...
            </span>
          )}
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-sm">
        {lines.length === 0 && figures.length === 0 && (
          <div className="text-neutral-600 text-center py-8">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Output will appear here</p>
          </div>
        )}

        {lines.map((line) => (
          <div
            key={line.id}
            className={
              line.stream === 'error'
                ? 'text-red-400 whitespace-pre-wrap break-all flex items-start gap-2'
                : line.stream === 'stderr'
                  ? 'text-yellow-400 whitespace-pre-wrap break-all'
                  : 'text-neutral-300 whitespace-pre-wrap break-all'
            }
          >
            {line.stream === 'error' && <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{line.text}</span>
          </div>
        ))}

        {figures.map((fig) => (
          <div key={fig.id} className="my-2">
            <div className="flex items-center gap-1 text-xs text-blue-400 mb-1">
              <ImageIcon className="w-3.5 h-3.5" /> Figure
            </div>
            <img
              src={'data:image/png;base64,' + fig.base64}
              alt="matplotlib figure"
              className="max-w-full rounded border border-neutral-700"
            />
          </div>
        ))}

        <div ref={endRef} />
      </div>
    </div>
  );
}
