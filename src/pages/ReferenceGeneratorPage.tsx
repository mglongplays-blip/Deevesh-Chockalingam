import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Copy, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { Project, ReferenceItem } from '../types';

export const ReferenceGeneratorPage: React.FC = () => {
  const { user } = useAuth();
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [style, setStyle] = useState<'APA 7' | 'Harvard' | 'MLA' | 'IEEE'>(
    (user?.referencing_style as 'APA 7' | 'Harvard' | 'MLA' | 'IEEE') || 'APA 7'
  );
  const [sourceType, setSourceType] = useState('Journal Article');
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState('');
  const [title, setTitle] = useState('');
  const [publisher, setPublisher] = useState('');
  const [doi, setDoi] = useState('');
  const [url, setUrl] = useState('');
  const [projectId, setProjectId] = useState('');
  const [verified, setVerified] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<{ references: ReferenceItem[] }>('/api/references'),
      apiFetch<{ projects: Project[] }>('/api/projects'),
    ])
      .then(([r, p]) => {
        setReferences(r.references);
        setProjects(p.projects);
      })
      .catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await apiFetch<{ reference: ReferenceItem }>('/api/references', {
        method: 'POST',
        body: JSON.stringify({
          style,
          source_type: sourceType,
          author,
          publication_year: year,
          title,
          publisher_or_journal: publisher,
          doi,
          url,
          project_id: projectId || null,
          verified,
        }),
      });
      setReferences((prev) => [res.reference, ...prev]);
      setAuthor('');
      setYear('');
      setTitle('');
      setPublisher('');
      setDoi('');
      setUrl('');
      setVerified(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add reference.');
    }
  };

  const handleToggleVerified = async (ref: ReferenceItem) => {
    const res = await apiFetch<{ reference: ReferenceItem }>(`/api/references/${ref.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ verified: !ref.verified }),
    });
    setReferences((prev) => prev.map((r) => (r.id === ref.id ? res.reference : r)));
  };

  const handleStyleChange = async (ref: ReferenceItem, nextStyle: ReferenceItem['style']) => {
    const res = await apiFetch<{ reference: ReferenceItem }>(`/api/references/${ref.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ style: nextStyle }),
    });
    setReferences((prev) => prev.map((r) => (r.id === ref.id ? res.reference : r)));
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/references/${id}`, { method: 'DELETE' });
    setReferences((prev) => prev.filter((r) => r.id !== id));
  };

  const copyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Entry Form */}
      <form
        onSubmit={handleCreate}
        className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 h-fit"
      >
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Add Source Reference
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            MG formats citations strictly from details you enter and never invents DOIs or authors.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as typeof style)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            >
              <option>APA 7</option>
              <option>Harvard</option>
              <option>MLA</option>
              <option>IEEE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Source Type</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            >
              <option>Journal Article</option>
              <option>Book</option>
              <option>Conference Paper</option>
              <option>Website / Report</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Author(s)</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. Smith, J., & Lee, K."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Year</label>
            <input
              type="text"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2024"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Full title of the article, book, or report"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Journal or Publisher
          </label>
          <input
            type="text"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            placeholder="e.g. Journal of Educational Technology, 14(2), 45-62"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">DOI</label>
            <input
              type="text"
              value={doi}
              onChange={(e) => setDoi(e.target.value)}
              placeholder="10.1000/xyz123"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Link to Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          >
            <option value="">All / Unassigned</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="rounded" />
          <span>I have independently verified this source&apos;s publication details</span>
        </label>

        <button
          type="submit"
          className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Generate &amp; Save Reference</span>
        </button>
      </form>

      {/* Right: Bibliography List */}
      <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Formatted Bibliography ({references.length})
          </h2>
          {references.length > 0 && (
            <button
              type="button"
              onClick={() =>
                copyText(
                  'all',
                  references.map((r) => r.formatted_reference).join('\n\n')
                )
              }
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {copiedId === 'all' ? 'Copied All' : 'Copy Full Bibliography'}
            </button>
          )}
        </div>

        {references.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
            No references saved yet. Add a journal article, book, or report on the left.
          </p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {references.map((ref) => (
              <div key={ref.id} className="py-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <select
                      value={ref.style}
                      onChange={(e) => handleStyleChange(ref, e.target.value as ReferenceItem['style'])}
                      aria-label="Citation style"
                      className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-200"
                    >
                      <option>APA 7</option>
                      <option>Harvard</option>
                      <option>MLA</option>
                      <option>IEEE</option>
                    </select>
                    <span>{ref.source_type}</span>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => handleToggleVerified(ref)}
                      className={`font-medium cursor-pointer ${
                        ref.verified
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {ref.verified ? 'Verified' : 'Not independently verified'}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => copyText(ref.id, ref.formatted_reference)}
                      className="inline-flex items-center gap-1 hover:text-indigo-600 cursor-pointer"
                    >
                      {copiedId === ref.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ref.id)}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      aria-label="Delete reference"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">
                  {ref.formatted_reference}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  In-text citation: <span className="font-mono-tabular text-slate-700 dark:text-slate-200">{ref.in_text_citation}</span>
                </p>

                {ref.missing_fields.length > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Missing information: {ref.missing_fields.join(', ')}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
