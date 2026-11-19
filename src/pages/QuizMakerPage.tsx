import React, { useEffect, useState } from 'react';
import { CheckCircle2, Layers, Loader2, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { Quiz, QuizResult, StudyDocument } from '../types';

export const QuizMakerPage: React.FC = () => {
  const { refreshUsage } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [documents, setDocuments] = useState<StudyDocument[]>([]);

  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [count, setCount] = useState(5);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [questionTypes, setQuestionTypes] = useState<string[]>(['multiple_choice', 'true_false']);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [mode, setMode] = useState<'quiz' | 'flashcards' | 'mock_exam'>('quiz');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedResult, setSubmittedResult] = useState<QuizResult | null>(null);
  const [flashIdx, setFlashIdx] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<{ quizzes: Quiz[]; results: QuizResult[] }>('/api/quizzes'),
      apiFetch<{ documents: StudyDocument[] }>('/api/documents'),
    ])
      .then(([q, d]) => {
        setQuizzes(q.quizzes);
        setResults(q.results);
        setDocuments(d.documents);
        if (q.quizzes.length > 0) setActiveQuiz(q.quizzes[0]);
      })
      .catch(() => {});
  }, []);

  const toggleType = (t: string) => {
    setQuestionTypes((prev) =>
      prev.includes(t) ? (prev.length > 1 ? prev.filter((x) => x !== t) : prev) : [...prev, t]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGenerating(true);
    try {
      const res = await apiFetch<{ quiz: Quiz }>('/api/quizzes/generate', {
        method: 'POST',
        body: JSON.stringify({
          topic: topic.trim(),
          documentIds: selectedDocs,
          difficulty,
          count,
          questionTypes,
        }),
      });
      setQuizzes((prev) => [res.quiz, ...prev]);
      setActiveQuiz(res.quiz);
      setAnswers({});
      setSubmittedResult(null);
      setFlashIdx(0);
      setFlashFlipped(false);
      await refreshUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quiz generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    const res = await apiFetch<{ result: QuizResult }>(`/api/quizzes/${activeQuiz.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    setSubmittedResult(res.result);
    setResults((prev) => [res.result, ...prev]);
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmittedResult(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Generator & History */}
      <div className="lg:col-span-4 space-y-6">
        <form
          onSubmit={handleGenerate}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Create Quiz or Mock Exam
          </h2>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Topic or Module Focus
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Neural Networks & Backpropagation"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              >
                <option>Foundational</option>
                <option>Intermediate</option>
                <option>Advanced / Honours</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Questions</label>
              <input
                type="number"
                min={3}
                max={20}
                value={count}
                onChange={(e) => setCount(Number(e.target.value) || 5)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Question Types</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['multiple_choice', 'Multiple Choice'],
                ['true_false', 'True / False'],
                ['short_answer', 'Short Answer'],
                ['fill_blank', 'Fill in Blanks'],
              ].map(([id, label]) => (
                <label key={id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={questionTypes.includes(id)}
                    onChange={() => toggleType(id)}
                    className="rounded"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {documents.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Source Study Notes (optional)
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-lg p-2">
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
                      className="rounded"
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
            <span>Generate Quiz</span>
          </button>
        </form>

        {/* Quiz History */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Saved Quizzes &amp; Attempts</h3>
          {quizzes.length === 0 ? (
            <p className="text-xs text-slate-500">No quizzes generated yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {quizzes.map((q) => {
                const latest = results.find((r) => r.quiz_id === q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setActiveQuiz(q);
                      setAnswers({});
                      setSubmittedResult(null);
                      setFlashIdx(0);
                      setFlashFlipped(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                      activeQuiz?.id === q.id
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{q.title}</p>
                    <p className="font-mono-tabular text-[11px] text-slate-500 mt-0.5">
                      {q.questions_json.length} questions · {q.difficulty}
                      {latest ? ` · Last: ${latest.score}/${latest.total_questions}` : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Interactive Quiz / Flashcards / Mock Exam */}
      <div className="lg:col-span-8">
        {!activeQuiz ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
            <Layers className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Quiz, Flashcard &amp; Mock Exam Workspace
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Generate a quiz from your uploaded lecture notes or enter any university topic on the left.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">{activeQuiz.title}</h2>
                <p className="font-mono-tabular text-xs text-slate-500 mt-0.5">
                  {activeQuiz.questions_json.length} items · {activeQuiz.difficulty}
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                {(
                  [
                    ['quiz', 'Interactive Quiz'],
                    ['flashcards', 'Flashcards'],
                    ['mock_exam', 'Mock Exam'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMode(id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                      mode === id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'flashcards' ? (
              <div className="space-y-4 py-4">
                {activeQuiz.questions_json[flashIdx] && (
                  <button
                    type="button"
                    onClick={() => setFlashFlipped((f) => !f)}
                    className="w-full min-h-[240px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-8 text-center flex flex-col items-center justify-center cursor-pointer"
                  >
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-3">
                      Card {flashIdx + 1} of {activeQuiz.questions_json.length} · Click to flip
                    </p>
                    <p className="font-display text-lg font-semibold text-slate-900 dark:text-white max-w-xl">
                      {flashFlipped
                        ? activeQuiz.questions_json[flashIdx].correct_answer
                        : activeQuiz.questions_json[flashIdx].question}
                    </p>
                    {flashFlipped && (
                      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 max-w-lg">
                        {activeQuiz.questions_json[flashIdx].explanation}
                      </p>
                    )}
                  </button>
                )}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    disabled={flashIdx === 0}
                    onClick={() => {
                      setFlashIdx((i) => i - 1);
                      setFlashFlipped(false);
                    }}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium disabled:opacity-40 cursor-pointer"
                  >
                    Previous Card
                  </button>
                  <button
                    type="button"
                    disabled={flashIdx >= activeQuiz.questions_json.length - 1}
                    onClick={() => {
                      setFlashIdx((i) => i + 1);
                      setFlashFlipped(false);
                    }}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium disabled:opacity-40 cursor-pointer"
                  >
                    Next Card
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {submittedResult && (
                  <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-display text-base font-bold text-slate-900 dark:text-white">
                        Score: <span className="font-mono-tabular">{submittedResult.score}/{submittedResult.total_questions}</span>{' '}
                        ({Math.round((submittedResult.score / Math.max(1, submittedResult.total_questions)) * 100)}%)
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Review the explanations below or retake the quiz.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake Quiz</span>
                    </button>
                  </div>
                )}

                {activeQuiz.questions_json.map((q, idx) => {
                  const evalItem = submittedResult?.answers_json.find((a) => a.question_id === q.id);
                  return (
                    <div key={q.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          <span className="font-mono-tabular text-indigo-600 dark:text-indigo-400 mr-2">Q{idx + 1}.</span>
                          {q.question}
                        </p>
                        {evalItem && (
                          evalItem.is_correct ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                          )
                        )}
                      </div>

                      {q.options && q.options.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt) => (
                            <label
                              key={opt}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer ${
                                answers[q.id] === opt
                                  ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40'
                                  : 'border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${q.id}`}
                                checked={answers[q.id] === opt}
                                disabled={Boolean(submittedResult)}
                                onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          disabled={Boolean(submittedResult)}
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="Type your answer..."
                          className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                        />
                      )}

                      {submittedResult && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs space-y-1">
                          <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                            Correct answer: {q.correct_answer}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {!submittedResult && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSubmitQuiz}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium cursor-pointer"
                    >
                      Submit &amp; Grade {mode === 'mock_exam' ? 'Mock Exam' : 'Quiz'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
