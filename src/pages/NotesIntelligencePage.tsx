import React, { useEffect, useState } from 'react';
import { BookOpen, Loader2, Search, Send, Sparkles, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { ChatMessage, StudyDocument } from '../types';

export const NotesIntelligencePage: React.FC = () => {
  const { refreshUsage } = useAuth();
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [analysisMode, setAnalysisMode] = useState<'summary' | 'chapters' | 'definitions' | 'concepts' | 'revision'>('summary');
  const [analysisText, setAnalysisText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<
    { document_id: string; file_name: string; page_number: number; section_label: string; content: string }[]
  >([]);

  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ documents: StudyDocument[] }>('/api/documents')
      .then((res) => {
        setDocuments(res.documents);
        setSelectedDocIds(res.documents.slice(0, 3).map((d) => d.id));
      })
      .catch(() => {});
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append('files', f));
      formData.append('enableOcr', 'true');
      const res = await apiFetch<{ documents: StudyDocument[] }>('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      setDocuments((prev) => [...res.documents, ...prev]);
      setSelectedDocIds((prev) => Array.from(new Set([...prev, ...res.documents.map((d) => d.id)])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    await apiFetch(`/api/documents/${id}`, { method: 'DELETE' });
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setSelectedDocIds((prev) => prev.filter((x) => x !== id));
  };

  const handleAnalyze = async (mode: typeof analysisMode) => {
    setAnalysisMode(mode);
    setError('');
    setAnalyzing(true);
    try {
      const res = await apiFetch<{ analysis: string }>('/api/notes/analyze', {
        method: 'POST',
        body: JSON.stringify({ documentIds: selectedDocIds, mode }),
      });
      setAnalysisText(res.analysis);
      await refreshUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const params = new URLSearchParams({ q: searchQuery.trim() });
    if (selectedDocIds.length > 0) params.set('documentIds', selectedDocIds.join(','));
    const res = await apiFetch<{ matches: typeof searchMatches }>(`/api/documents/search?${params.toString()}`);
    setSearchMatches(res.matches);
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion('');
    setError('');
    setAsking(true);

    const optimisticUserMsg: ChatMessage = {
      id: `local_${Date.now()}`,
      conversation_id: conversationId || '',
      role: 'user',
      content: q,
      citations_json: [],
      provider_used: '',
      model_used: '',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      const res = await apiFetch<{ conversationId: string; message: ChatMessage }>('/api/notes/ask', {
        method: 'POST',
        body: JSON.stringify({ question: q, documentIds: selectedDocIds, conversationId }),
      });
      setConversationId(res.conversationId);
      setMessages((prev) => [...prev, res.message]);
      await refreshUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to answer question.');
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Document Library & Search */}
      <div className="lg:col-span-4 space-y-5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Study Materials
            </h2>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? 'Uploading...' : 'Upload'}</span>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,.txt,.md"
                onChange={(e) => handleUpload(e.target.files)}
                className="hidden"
              />
            </label>
          </div>

          {documents.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
              Upload lecture PDFs, Word notes, or PowerPoint slides to summarize and query them.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <label className="flex items-start gap-2.5 min-w-0 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.id)}
                      onChange={() =>
                        setSelectedDocIds((prev) =>
                          prev.includes(doc.id) ? prev.filter((x) => x !== doc.id) : [...prev, doc.id]
                        )
                      }
                      className="mt-0.5 rounded"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{doc.file_name}</p>
                      <p className="font-mono-tabular text-[11px] text-slate-500">
                        {doc.page_count}p · {doc.word_count}w
                      </p>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                    aria-label="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search within documents */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Search Within Documents</h3>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keywords or terms..."
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs cursor-pointer"
              aria-label="Search documents"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
          {searchMatches.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto pt-1">
              {searchMatches.map((m, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 text-xs space-y-1">
                  <p className="font-medium text-indigo-600 dark:text-indigo-400">
                    {m.file_name} · {m.section_label}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 line-clamp-3">{m.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Summaries & Ask Genie Chat */}
      <div className="lg:col-span-8 space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Structured Extractors */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Extract Study Intelligence
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['summary', 'Full Summary'],
                  ['chapters', 'Chapters'],
                  ['definitions', 'Definitions'],
                  ['concepts', 'Key Concepts'],
                  ['revision', 'Revision Notes'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  disabled={analyzing}
                  onClick={() => handleAnalyze(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    analysisMode === id && analysisText
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {analyzing ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              <span>Analyzing selected study materials...</span>
            </div>
          ) : analysisText ? (
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 dark:text-slate-200 leading-relaxed max-h-80 overflow-y-auto p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              {analysisText}
            </pre>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Select documents on the left and click any extraction mode above.
            </div>
          )}
        </div>

        {/* Ask Genie About Your Notes */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col h-[460px]">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Ask Genie about your notes
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <Sparkles className="w-6 h-6 text-indigo-500 mb-2" />
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Grounded Q&amp;A from your uploaded materials
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
                  Genie prioritizes passages from your selected files, shows supporting file names and page labels, and states clearly when an answer is absent.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.citations_json && m.citations_json.length > 0 && (
                    <div className="mt-2 max-w-[85%] text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                      <p className="font-medium">Supporting sources:</p>
                      {m.citations_json.map((c, idx) => (
                        <p key={idx}>
                          {c.file_name} · {c.section_label}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAsk} className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your uploaded notes..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Ask</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
