'use client';

import { useState, useEffect, useRef } from 'react';
import { BookOpen, Search, Upload, Trash2, FileText, Send, Loader2, Brain, ExternalLink } from 'lucide-react';

type Tab = 'docs' | 'search' | 'ask';

export default function KnowledgePage() {
  const [tab, setTab] = useState<Tab>('docs');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = typeof window !== 'undefined' ? localStorage.getItem('biodockify_user_id') ?? 'demo-user' : 'demo-user';

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/learning/knowledge?user_id=${userId}`);
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900 dark:text-white">
            <BookOpen className="w-6 h-6 text-emerald-600" /> Knowledge Engine
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Upload documents, search your knowledge base, and ask AI questions
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {([
            { id: 'docs' as Tab, label: 'My Documents', icon: FileText },
            { id: 'search' as Tab, label: 'Search', icon: Search },
            { id: 'ask' as Tab, label: 'Ask AI', icon: Brain },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === id
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {tab === 'docs' && (
          <DocumentsTab
            documents={documents}
            loading={loading}
            userId={userId}
            onRefresh={fetchDocuments}
          />
        )}
        {tab === 'search' && <SearchTab userId={userId} />}
        {tab === 'ask' && <AskTab userId={userId} />}
      </div>
    </div>
  );
}

// ==================== Documents Tab ====================

function DocumentsTab({
  documents,
  loading,
  userId,
  onRefresh,
}: {
  documents: any[];
  loading: boolean;
  userId: string;
  onRefresh: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const handleUpload = async () => {
    if (!title.trim() || !content.trim()) return;
    setUploading(true);
    try {
      await fetch('/api/learning/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, title, content, doc_type: 'text' }),
      });
      setTitle('');
      setContent('');
      setShowUpload(false);
      onRefresh();
    } catch {}
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    await fetch(`/api/learning/knowledge/${id}?user_id=${userId}`, { method: 'DELETE' });
    onRefresh();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-neutral-900 dark:text-white">{documents.length} Documents</h2>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
        >
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {showUpload && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 mb-6">
          <h3 className="font-medium text-neutral-900 dark:text-white mb-4">Add Document</h3>
          <input
            type="text"
            placeholder="Document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 mb-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
          />
          <textarea
            placeholder="Paste document content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full px-4 py-2 mb-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white resize-y"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-neutral-400">{content.length.toLocaleString()} characters</span>
            <button
              onClick={handleUpload}
              disabled={uploading || !title.trim() || !content.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">No documents yet. Upload your first document to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">{doc.title}</p>
                  <p className="text-xs text-neutral-500">
                    {doc.doc_type} &bull; {(doc.file_size / 1000).toFixed(1)}KB &bull;{' '}
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== Search Tab ====================

function SearchTab({ userId }: { userId: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/learning/knowledge/search?user_id=${userId}&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {}
    setSearching(false);
  };

  return (
    <div>
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search your documents..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => (
            <div key={r.id} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                <span className="font-medium text-neutral-900 dark:text-white">{r.title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                  {r.doc_type}
                </span>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{r.snippet}</p>
            </div>
          ))}
        </div>
      )}

      {searching === false && query && results.length === 0 && (
        <p className="text-center text-neutral-500 py-8">No results found for "{query}"</p>
      )}
    </div>
  );
}

// ==================== Ask AI Tab ====================

function AskTab({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string; sources?: string[] }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const ask = async () => {
    if (!input.trim() || loading) return;
    const question = input;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const res = await fetch('/api/learning/knowledge/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, question }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: 'ai', content: data.answer ?? 'No answer.', sources: data.sources },
      ]);
    } catch {
      setMessages((m) => [...m, { role: 'ai', content: 'Error: Could not get answer.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col h-[500px]">
      <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-900/20">
        <h3 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
          <Brain className="w-4 h-4 text-emerald-500" /> Ask about your documents
        </h3>
        <p className="text-xs text-neutral-500 mt-0.5">Questions are answered using your uploaded documents</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 text-neutral-400">
            <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Ask a question about your documents</p>
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
        <div ref={endRef} />
      </div>

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
