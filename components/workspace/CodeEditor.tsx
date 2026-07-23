'use client';

import { useRef, useEffect } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * CodeMirror 6 editor loaded from CDN.
 * No npm dependency — loaded via dynamic script injection.
 */
export function CodeEditor({ value, onChange }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const cmViewRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEditor() {
      if (!containerRef.current || cmViewRef.current) return;

      // Load CodeMirror from CDN
      const existingScript = document.querySelector('script[data-cm]');
      if (!existingScript) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/codeMirror@6.65.7/dist/index.min.js';
          script.onerror = () => reject(new Error('Failed to load CodeMirror'));
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      // Wait for CodeMirror global
      await new Promise<void>((resolve) => {
        const check = () => {
          if ((window as any).CodeMirror) resolve();
          else setTimeout(check, 50);
        };
        check();
      });

      if (cancelled || !containerRef.current) return;

      // Use CodeMirror 6 basic setup via the CDN bundle
      const CM = (window as any).CodeMirror;
      const EditorState = CM.EditorState;
      const EditorView = CM.EditorView;
      const python = CM.python;
      const defaultHighlightStyle = CM.defaultHighlightStyle;
      const syntaxHighlighting = CM.syntaxHighlighting;
      const lineNumbers = CM.lineNumbers;
      const highlightActiveLine = CM.highlightActiveLine;
      const bracketMatching = CM.bracketMatching;
      const closeBrackets = CM.closeBrackets;
      const indentOnInput = CM.indentOnInput;
      const history = CM.history;
      const indentUnit = CM.indentUnit;
      const HighlightStyle = CM.HighlightStyle;
      const tags = CM.tags;

      // Create a Python-aware theme
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

      // Syntax highlight colors (GitHub Dark inspired)
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
        EditorView.updateListener.of((update: any) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
      ];

      const state = EditorState.create({
        doc: value,
        extensions,
      });

      const view = new EditorView({
        state,
        parent: containerRef.current,
      });

      cmViewRef.current = view;
    }

    loadEditor().catch((err) => {
      console.error('Failed to load CodeMirror:', err);
      // Fallback: render a simple textarea
      if (containerRef.current && !cmViewRef.current) {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.className = 'w-full h-full bg-[#0d1117] text-[#c9d1d9] p-3 font-mono text-sm resize-none focus:outline-none';
        ta.style.fontFamily = "'JetBrains Mono', monospace";
        ta.oninput = () => onChange(ta.value);
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(ta);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update editor content when value changes externally (e.g., template load)
  useEffect(() => {
    if (cmViewRef.current && value !== cmViewRef.current.state.doc.toString()) {
      const CM = (window as any).CodeMirror;
      if (CM) {
        cmViewRef.current.dispatch({
          changes: {
            from: 0,
            to: cmViewRef.current.state.doc.length,
            insert: value,
          },
        });
      }
    }
  }, [value]);

  return <div ref={containerRef} className="w-full h-full overflow-hidden" />;
}
