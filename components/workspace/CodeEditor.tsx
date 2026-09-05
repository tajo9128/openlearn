'use client';

import { useRef, useEffect } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine } from '@codemirror/view';
import {
  syntaxHighlighting,
  bracketMatching,
  indentOnInput,
  indentUnit,
  HighlightStyle,
} from '@codemirror/language';
import { closeBrackets } from '@codemirror/autocomplete';
import { history } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { tags } from '@lezer/highlight';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

// GitHub Dark inspired Python theme
const pythonTheme = EditorView.theme({
  '&': {
    backgroundColor: '#0d1117',
    color: '#c9d1d9',
    fontSize: '14px',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    height: '100%',
  },
  '.cm-content': { padding: '12px 0', caretColor: '#58a6ff' },
  '.cm-gutters': { backgroundColor: '#161b22', color: '#484f58', border: 'none' },
  '.cm-activeLine': { backgroundColor: '#161b22' },
  '.cm-activeLineGutter': { backgroundColor: '#161b22', color: '#c9d1d9' },
  '.cm-selectionBackground, ::selection': { backgroundColor: '#264f78' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: '#264f78' },
  '.cm-cursor': { borderLeftColor: '#58a6ff' },
});

const pythonHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#ff7b72' },
  { tag: tags.string, color: '#a5d6ff' },
  { tag: tags.number, color: '#79c0ff' },
  { tag: tags.comment, color: '#8b949e', fontStyle: 'italic' },
  { tag: tags.function(tags.variableName), color: '#d2a8ff' },
  { tag: tags.typeName, color: '#ffa657' },
  { tag: tags.variableName, color: '#c9d1d9' },
  { tag: tags.propertyName, color: '#79c0ff' },
  { tag: tags.operator, color: '#ff7b72' },
]);

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Only initialize if not already initialized
    if (viewRef.current) return;

    try {
      const extensions = [
        lineNumbers(),
        highlightActiveLine(),
        bracketMatching(),
        closeBrackets(),
        history(),
        indentUnit.of('    '),
        indentOnInput(),
        EditorState.tabSize.of(4),
        EditorView.lineWrapping,
        python(),
        syntaxHighlighting(pythonHighlight),
        pythonTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
      ];

      const view = new EditorView({
        state: EditorState.create({ doc: value, extensions }),
        parent: containerRef.current,
      });

      viewRef.current = view;
    } catch (err) {
      console.error('Failed to init CodeMirror:', err);
      // Fallback: render a simple textarea
      if (containerRef.current && !viewRef.current) {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.className = 'w-full h-full bg-[#0d1117] text-[#c9d1d9] p-3 font-mono text-sm resize-none focus:outline-none';
        ta.style.fontFamily = "'JetBrains Mono', monospace";
        ta.oninput = () => onChange(ta.value);
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(ta);
      }
    }

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef.current]); // Re-run if containerRef becomes available

  // Update editor content when value changes externally (e.g., template load)
  useEffect(() => {
    const view = viewRef.current;
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return <div ref={containerRef} className="w-full h-full overflow-hidden" />;
}
