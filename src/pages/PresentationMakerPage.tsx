import React, { useEffect, useState } from 'react';
import { Download, Loader2, Presentation, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, downloadFile } from '../lib/api';
import type { Assignment, StudyDocument } from '../types';

interface SlideItem {
  title: string;
  subtitle?: string;
  layout?: string;
  bullets: string[];
  speaker_notes?: string;
}

interface DeckData {
  title: string;
  subtitle?: string;
  design_recommendations?: string;
  slides: SlideItem[];
}

export const PresentationMakerPage: React.FC = () => {
  const { refreshUsage } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [documents, setDocuments] = useState<StudyDocument[]>([]);

  const [topic, setTopic] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [slideCount, setSlideCount] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deck, setDeck] = useState<DeckData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<{ assignments: Assignment[] }>('/api/assignments'),
      apiFetch<{ documents: StudyDocument[] }>('/api/documents'),
    ])
      .then(([a, d]) => {
        setAssignments(a.assignments);
        setDocuments(d.documents);
      })
      .catch(() => {});
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGenerating(true);
    try {
      const res = await apiFetch<{ deck: DeckData }>('/api/presentations/generate', {
        method: 'POST',
        body: JSON.stringify({
          topic,
          assignmentId: assignmentId || undefined,
          documentIds: selectedDocs,
          slideCount,
        }),
      });
      setDeck(res.deck);
      await refreshUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate presentation.');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPptx = async () => {
    if (!deck) return;
    setExporting(true);
    setError('');
    try {
      const safeName = deck.title.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 50) || 'presentation';
      await downloadFile('/api/presentations/export-pptx', `${safeName}.pptx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PPTX export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <form
        onSubmit={handleGenerate}
        className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 h-fit"
      >
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Presentation Builder
        </h2>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Presentation Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Renewable Grid Storage Solutions"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Base on Assignment (optional)
          </label>
          <select
            value={assignmentId}
            onChange={(e) => setAssignmentId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          >
            <option value="">None</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Slide Count (<span className="font-mono-tabular">{slideCount}</span> slides)
          </label>
          <input
            type="range"
            min={4}
            max={15}
            value={slideCount}
            onChange={(e) => setSlideCount(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {documents.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Include Study Notes (optional)
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-800 rounded-lg p-2">
              {documents.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDocs.includes(d.id)}
                    onChange={() =>
                      setSelectedDocs((prev) =>
                        prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]
                      )
                    }
                  />
                  <span className="truncate">{d.file_name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={generating}
          className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>Generate Slide Deck</span>
        </button>
      </form>

      <div className="lg:col-span-8">
        {!deck ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
            <Presentation className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Academic Presentation Maker
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Generate structured slides with speaker notes and design suggestions, then download as a real .pptx file.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">{deck.title}</h2>
                {deck.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{deck.subtitle}</p>}
              </div>
              <button
                type="button"
                disabled={exporting}
                onClick={handleExportPptx}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{exporting ? 'Exporting...' : 'Export PPTX'}</span>
              </button>
            </div>

            {deck.design_recommendations && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 text-xs text-slate-600 dark:text-slate-300">
                <strong>Design Recommendation:</strong> {deck.design_recommendations}
              </div>
            )}

            <div className="space-y-4">
              {deck.slides.map((slide, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono-tabular text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      Slide {idx + 1} {slide.layout ? `· ${slide.layout}` : ''}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={slide.title}
                    onChange={(e) => {
                      const next = [...deck.slides];
                      next[idx] = { ...next[idx], title: e.target.value };
                      setDeck({ ...deck, slides: next });
                    }}
                    className="w-full font-display text-base font-semibold bg-transparent border-b border-slate-200 dark:border-slate-800 pb-1 text-slate-900 dark:text-white focus:outline-none"
                  />
                  <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300 list-disc pl-5">
                    {slide.bullets.map((b, bi) => (
                      <li key={bi}>{b}</li>
                    ))}
                  </ul>
                  {slide.speaker_notes !== undefined && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Speaker Notes</label>
                      <textarea
                        rows={2}
                        value={slide.speaker_notes}
                        onChange={(e) => {
                          const next = [...deck.slides];
                          next[idx] = { ...next[idx], speaker_notes: e.target.value };
                          setDeck({ ...deck, slides: next });
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
