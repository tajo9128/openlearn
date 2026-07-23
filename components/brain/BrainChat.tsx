'use client';

import { useState } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'brain';
  content: string;
  sources?: string[];
}

export function BrainChat({ courseId, userId }: { courseId: string; userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!input.trim() || loading) return;

    const question = input;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const res = await fetch('/api/brain/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, course_id: courseId, question }),
      });
      const data = await res.json();

      if (data.success) {
        setMessages((m) => [
          ...m,
          {
            role: 'brain',
            content: data.answer,
            sources: data.sources,
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: 'brain', content: 'Sorry, I could not process that. ' + (data.error ?? '') },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'brain', content: 'Connection error. Please try again.' },
      ]);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-900/20">
        <h3 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
          <Sparkles className="w-4 h-4 text-emerald-500" /> Ask the Brain
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 text-neutral-400">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Ask me anything about this course</p>
            <p className="text-xs mt-1">I have full context of the course materials</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700 text-xs opacity-70">
                  Sources: {msg.sources.join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="Ask a question..."
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
        />
        <button
          onClick={ask}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
