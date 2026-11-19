import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, Check, Copy, Loader2, PenTool, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

const STYLES = [
  'Simple English',
  'Natural academic English',
  'Professional English',
  'Formal academic English',
  'Concise English',
  'Clear and readable English',
];

export const HumanizerPage: React.FC = () => {
  const { user, refreshUsage } = useAuth();
  const [original, setOriginal] = useState('');
  const [rewritten, setRewritten] = useState('');
  const [style, setStyle] = useState(user?.writing_style || 'Natural academic English');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const origWords = useMemo(() => (original.trim() ? original.trim().split(/\s+/).length : 0), [original]);
  const newWords = useMemo(() => (rewritten.trim() ? rewritten.trim().split(/\s+/).length : 0), [rewritten]);

  const handleRewrite = async () => {
    if (!original.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ rewritten: string }>('/api/humanizer/rewrite', {
        method: 'POST',
        body: JSON.stringify({ text: original, style }),
      });
      setRewritten(res.rewritten);
      await refreshUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refine writing.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!rewritten) return;
    await navigator.clipboard.writeText(rewritten);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleReplace = () => {
    if (!rewritten) return;
    setOriginal(rewritten);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Genie Humanizer — Authentic Academic Writing Improvement
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Improves grammar, sentence flow, and transitions while preserving original meaning, technical terms, and citations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            aria-label="Target writing style"
            className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium"
          >
            {STYLES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={loading || !original.trim()}
            onClick={handleRewrite}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
            <span>Improve Writing</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Original Text</span>
            <span className="font-mono-tabular text-xs text-slate-500">{origWords} words</span>
          </div>
          <textarea
            rows={15}
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            placeholder="Paste your academic paragraph or draft excerpt here..."
            className="w-full p-4 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-none resize-y"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              Improved Output ({style})
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono-tabular text-xs text-slate-500">{newWords} words</span>
              <button
                type="button"
                disabled={!rewritten}
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 disabled:opacity-40 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                disabled={!rewritten}
                onClick={handleReplace}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 disabled:opacity-40 cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Replace Original</span>
              </button>
            </div>
          </div>
          <textarea
            rows={15}
            readOnly
            value={rewritten}
            placeholder="Your improved academic writing will appear here..."
            className="w-full p-4 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-none resize-y"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70 p-4 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
        <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <p>
          Academic integrity notice: Genie Humanizer helps clarify structure, grammar, and readability in your own voice. It never fabricates research findings or personal experiences and does not claim to bypass AI detection systems.
        </p>
      </div>
    </div>
  );
};
