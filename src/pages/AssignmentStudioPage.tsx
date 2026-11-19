import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bold,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Heading1,
  Heading2,
  Italic,
  List,
  Loader2,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, downloadFile } from '../lib/api';
import type { Assignment, AssignmentSection, Project, StudyDocument } from '../types';

const ASSIGNMENT_TYPES = [
  'Essay',
  'Report',
  'Case Study',
  'Reflective Writing',
  'Research Proposal',
  'Literature Review',
  'Business Report',
  'Project Report',
  'Practical Assignment',
  'Academic Discussion',
  'Other University Format',
];

const STEPS = [
  { id: 1, label: '1. Instructions' },
  { id: 2, label: '2. Materials' },
  { id: 3, label: '3. AI Analysis' },
  { id: 4, label: '4. Outline' },
  { id: 5, label: '5. Draft' },
  { id: 6, label: '6. Rubric' },
  { id: 7, label: '7. Editor' },
  { id: 8, label: '8. Final Review' },
  { id: 9, label: '9. Export' },
];

interface AssignmentStudioPageProps {
  initialAssignmentId?: string | null;
}

export const AssignmentStudioPage: React.FC<AssignmentStudioPageProps> = ({ initialAssignmentId }) => {
  const { user, refreshUsage } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialAssignmentId || null);
  const [active, setActive] = useState<Assignment | null>(null);
  const [sections, setSections] = useState<AssignmentSection[]>([]);
  const [step, setStep] = useState(1);

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [enableOcr, setEnableOcr] = useState(true);

  // Create modal
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Essay');
  const [newProjectId, setNewProjectId] = useState('');

  // Editor Undo/Redo history & AI Rewrite
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [rewriteTarget, setRewriteTarget] = useState('');
  const [rewriteInstruction, setRewriteInstruction] = useState('Improve academic clarity, cohesion, and critical depth.');
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const autosaveTimer = useRef<number | null>(null);

  const loadWorkspaceData = useCallback(async () => {
    try {
      const [aRes, pRes, dRes] = await Promise.all([
        apiFetch<{ assignments: Assignment[] }>('/api/assignments'),
        apiFetch<{ projects: Project[] }>('/api/projects'),
        apiFetch<{ documents: StudyDocument[] }>('/api/documents'),
      ]);
      setAssignments(aRes.assignments);
      setProjects(pRes.projects);
      setDocuments(dRes.documents);
      if (!selectedId && aRes.assignments.length > 0) {
        setSelectedId(aRes.assignments[0].id);
      }
    } catch {
      // handled gracefully
    }
  }, [selectedId]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  useEffect(() => {
    if (initialAssignmentId) setSelectedId(initialAssignmentId);
  }, [initialAssignmentId]);

  useEffect(() => {
    if (!selectedId) {
      setActive(null);
      setSections([]);
      return;
    }
    apiFetch<{ assignment: Assignment; sections: AssignmentSection[] }>(`/api/assignments/${selectedId}`)
      .then((res) => {
        setActive(res.assignment);
        setSections(res.sections);
        setUndoStack([]);
        setRedoStack([]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load assignment.'));
  }, [selectedId]);

  const wordCount = useMemo(() => {
    const text = active?.draft_markdown?.trim() || '';
    return text ? text.split(/\s+/).length : 0;
  }, [active?.draft_markdown]);

  const headingsList = useMemo(() => {
    const text = active?.draft_markdown || '';
    return text
      .split('\n')
      .map((line, lineIdx) => ({ line: line.trim(), lineIdx }))
      .filter((item) => /^#{1,3}\s+/.test(item.line));
  }, [active?.draft_markdown]);

  const saveAssignmentPatch = async (patch: Partial<Assignment>, silent = false) => {
    if (!active) return;
    if (!silent) setBusyAction('saving');
    try {
      const res = await apiFetch<{ assignment: Assignment }>(`/api/assignments/${active.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      setActive(res.assignment);
      setAssignments((prev) => prev.map((a) => (a.id === res.assignment.id ? res.assignment : a)));
      if (!silent) setStatusMsg('Changes saved.');
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      if (!silent) setBusyAction(null);
    }
  };

  const updateDraftWithHistory = (nextText: string) => {
    if (!active) return;
    setUndoStack((prev) => [...prev.slice(-24), active.draft_markdown || '']);
    setRedoStack([]);
    setActive({ ...active, draft_markdown: nextText });

    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      saveAssignmentPatch({ draft_markdown: nextText }, true);
    }, 1200);
  };

  const handleUndo = () => {
    if (!active || undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((u) => u.slice(0, -1));
    setRedoStack((r) => [...r, active.draft_markdown || '']);
    setActive({ ...active, draft_markdown: prev });
  };

  const handleRedo = () => {
    if (!active || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, active.draft_markdown || '']);
    setActive({ ...active, draft_markdown: next });
  };

  const applyFormat = (prefix: string, suffix = '') => {
    if (!editorRef.current || !active) return;
    const el = editorRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = active.draft_markdown || '';
    const selected = val.slice(start, end) || 'Text';
    const next = val.slice(0, start) + prefix + selected + suffix + val.slice(end);
    updateDraftWithHistory(next);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setError('');
    setBusyAction('creating');
    try {
      const res = await apiFetch<{ assignment: Assignment }>('/api/assignments', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          assignment_type: newType,
          project_id: newProjectId || null,
          academic_level: user?.academic_level || 'Undergraduate',
          referencing_style: user?.referencing_style || 'APA 7',
        }),
      });
      setAssignments((prev) => [res.assignment, ...prev]);
      setSelectedId(res.assignment.id);
      setShowNewForm(false);
      setNewTitle('');
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      await apiFetch(`/api/assignments/${id}`, { method: 'DELETE' });
      const remaining = assignments.filter((a) => a.id !== id);
      setAssignments(remaining);
      setSelectedId(remaining[0]?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete assignment.');
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !active) return;
    setError('');
    setStatusMsg('');
    setBusyAction('uploading');
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append('files', f));
      if (active.project_id) formData.append('projectId', active.project_id);
      formData.append('enableOcr', String(enableOcr));

      const res = await apiFetch<{ documents: StudyDocument[] }>('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      setDocuments((prev) => [...res.documents, ...prev]);
      const newIds = Array.from(new Set([...active.attached_document_ids, ...res.documents.map((d) => d.id)]));
      await saveAssignmentPatch({ attached_document_ids: newIds }, true);
      setStatusMsg(`Uploaded and indexed ${res.documents.length} file(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const toggleDocAttachment = async (docId: string) => {
    if (!active) return;
    const exists = active.attached_document_ids.includes(docId);
    const nextIds = exists
      ? active.attached_document_ids.filter((id) => id !== docId)
      : [...active.attached_document_ids, docId];
    await saveAssignmentPatch({ attached_document_ids: nextIds }, true);
  };

  const runAIAction = async (
    actionName: string,
    endpoint: string,
    body: unknown,
    onSuccess: (data: Record<string, unknown>) => void
  ) => {
    setError('');
    setStatusMsg('');
    setBusyAction(actionName);
    try {
      const data = await apiFetch<Record<string, unknown>>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      onSuccess(data);
      await refreshUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveOutline = async () => {
    if (!active) return;
    setBusyAction('saving-outline');
    try {
      const res = await apiFetch<{ sections: AssignmentSection[] }>(`/api/assignments/${active.id}/sections`, {
        method: 'PUT',
        body: JSON.stringify({ sections }),
      });
      setSections(res.sections);
      setStatusMsg('Outline saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save outline.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleRewriteSelection = async () => {
    if (!active || !rewriteTarget.trim()) return;
    await runAIAction(
      'rewrite',
      `/api/assignments/${active.id}/rewrite-selection`,
      { text: rewriteTarget, instruction: rewriteInstruction },
      (data) => {
        const rewritten = String(data.rewritten || '');
        if (!rewritten) return;
        const current = active.draft_markdown || '';
        const updated = current.includes(rewriteTarget)
          ? current.replace(rewriteTarget, rewritten)
          : `${current}\n\n${rewritten}`;
        updateDraftWithHistory(updated);
        setRewriteTarget('');
        setStatusMsg('Section rewritten in editor.');
      }
    );
  };

  const handleExport = async (format: 'docx' | 'pdf' | 'txt') => {
    if (!active) return;
    setError('');
    setBusyAction(`export-${format}`);
    try {
      await saveAssignmentPatch({ draft_markdown: active.draft_markdown }, true);
      const safeName = active.title.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60) || 'assignment';
      await downloadFile(`/api/assignments/${active.id}/export/${format}`, `${safeName}.${format}`);
      setStatusMsg(`Exported ${safeName}.${format}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Top Toolbar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedId || ''}
            onChange={(e) => setSelectedId(e.target.value || null)}
            aria-label="Select saved assignment"
            className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium min-w-[220px]"
          >
            <option value="">Select an assignment...</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.assignment_type})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowNewForm((s) => !s)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Assignment</span>
          </button>

          {active && (
            <button
              type="button"
              onClick={() => handleDeleteAssignment(active.id)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-600 hover:border-rose-300 cursor-pointer"
              aria-label="Delete selected assignment"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {active && (
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-mono-tabular">
              Words: <strong className="text-slate-900 dark:text-white">{wordCount}</strong> / {active.target_word_count}
            </span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => saveAssignmentPatch(active)}
              disabled={busyAction === 'saving'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{busyAction === 'saving' ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        )}
      </div>

      {/* New Assignment Creator */}
      {showNewForm && (
        <form
          onSubmit={handleCreateAssignment}
          className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 p-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Assignment Title
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Ethical Governance of Clinical AI Systems"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Format
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              {ASSIGNMENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={newProjectId}
              onChange={(e) => setNewProjectId(e.target.value)}
              aria-label="Project"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busyAction === 'creating'}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shrink-0 cursor-pointer"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {!active ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <FileText className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
            Genie Assignment Studio
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Create an assignment to analyze lecturer briefs, index study materials, build an editable outline, draft with rubric checks, and export real DOCX, PDF, or TXT files.
          </p>
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium cursor-pointer"
          >
            Start New Assignment
          </button>
        </div>
      ) : (
        <>
          {/* 9-Step Workflow Bar */}
          <div className="overflow-x-auto pb-1">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 min-w-full">
              {STEPS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    step === s.id
                      ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 1: ASSIGNMENT INSTRUCTIONS */}
          {step === 1 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  Step 1. Assignment Instructions &amp; Parameters
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    saveAssignmentPatch(active);
                    setStep(2);
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium cursor-pointer"
                >
                  Save &amp; Continue
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assignment Title
                  </label>
                  <input
                    type="text"
                    value={active.title}
                    onChange={(e) => setActive({ ...active, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assignment Type
                  </label>
                  <select
                    value={active.assignment_type}
                    onChange={(e) => setActive({ ...active, assignment_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    {ASSIGNMENT_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Subject / Module
                  </label>
                  <input
                    type="text"
                    value={active.subject}
                    onChange={(e) => setActive({ ...active, subject: e.target.value })}
                    placeholder="e.g. Software Engineering"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Target Word Count
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={25000}
                    value={active.target_word_count}
                    onChange={(e) => setActive({ ...active, target_word_count: Number(e.target.value) || 1500 })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Referencing Style
                  </label>
                  <select
                    value={active.referencing_style}
                    onChange={(e) => setActive({ ...active, referencing_style: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option>APA 7</option>
                    <option>Harvard</option>
                    <option>MLA</option>
                    <option>IEEE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Academic Level
                  </label>
                  <select
                    value={active.academic_level}
                    onChange={(e) => setActive({ ...active, academic_level: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option>Foundation / Diploma</option>
                    <option>Undergraduate</option>
                    <option>Honours</option>
                    <option>Postgraduate / Masters</option>
                    <option>Doctoral / PhD</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Submission Requirements
                  </label>
                  <input
                    type="text"
                    value={active.submission_requirements}
                    onChange={(e) => setActive({ ...active, submission_requirements: e.target.value })}
                    placeholder="e.g. 12pt font, 1.5 line spacing, minimum 8 peer-reviewed sources"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assignment Question / Prompt
                  </label>
                  <textarea
                    rows={3}
                    value={active.question}
                    onChange={(e) => setActive({ ...active, question: e.target.value })}
                    placeholder="Paste the exact assignment question or thesis prompt..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Lecturer Instructions &amp; Marking Rubric Notes
                  </label>
                  <textarea
                    rows={4}
                    value={active.lecturer_instructions}
                    onChange={(e) => setActive({ ...active, lecturer_instructions: e.target.value })}
                    placeholder="Paste lecturer guidelines, required theories, or rubric criteria..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: UPLOAD STUDY MATERIALS */}
          {step === 2 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                    Step 2. Upload Lecture Notes, Slides &amp; Rubrics
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Supported: PDF, DOCX, PPTX, TXT, MD (up to 10 MB per file). Select which files apply to this assignment.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableOcr}
                    onChange={(e) => setEnableOcr(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Auto-OCR scanned PDFs</span>
                </label>
              </div>

              <label className="block border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer">
                <Upload className="w-7 h-7 text-indigo-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {busyAction === 'uploading' ? 'Extracting & indexing documents...' : 'Click or drop files to upload'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Multiple files supported · Private user-isolated storage
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.pptx,.txt,.md"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
              </label>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  Your Study Document Library ({documents.length})
                </h3>
                {documents.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No documents uploaded yet. Upload lecture slides, PDF readings, or marking rubrics above.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                    {documents.map((doc) => {
                      const attached = active.attached_document_ids.includes(doc.id);
                      return (
                        <div key={doc.id} className="p-3.5 flex items-center justify-between gap-4">
                          <label className="flex items-start gap-3 cursor-pointer min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={attached}
                              onChange={() => toggleDocAttachment(doc.id)}
                              className="mt-1 rounded border-slate-300"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                {doc.file_name}
                              </p>
                              <p className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                                {doc.page_count} pages · {doc.word_count} words
                                {doc.ocr_used ? ' · OCR transcribed' : ''}
                              </p>
                            </div>
                          </label>
                          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 shrink-0">
                            {attached ? 'Attached' : 'Available'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: AI ANALYSIS */}
          {step === 3 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                    Step 3. AI Brief &amp; Material Analysis
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Extracts requirements, learning outcomes, marking criteria, and required sections.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyAction === 'analyze'}
                  onClick={() =>
                    runAIAction(
                      'analyze',
                      `/api/assignments/${active.id}/analyze`,
                      {},
                      (data) => {
                        setActive(data.assignment as Assignment);
                        setStatusMsg('Assignment requirements analyzed.');
                      }
                    )
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-60 cursor-pointer"
                >
                  {busyAction === 'analyze' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Run AI Analysis</span>
                </button>
              </div>

              {active.analysis_json ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <h3 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Main Question</h3>
                    <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{active.analysis_json.main_question}</p>
                  </div>
                  {[
                    { title: 'Assignment Requirements', items: active.analysis_json.requirements },
                    { title: 'Key Topics', items: active.analysis_json.key_topics },
                    { title: 'Learning Outcomes', items: active.analysis_json.learning_outcomes },
                    { title: 'Marking Criteria', items: active.analysis_json.marking_criteria },
                    { title: 'Required Sections', items: active.analysis_json.required_sections },
                  ].map((group) => (
                    <div key={group.title} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">{group.title}</h3>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                        {(group.items || []).map((it, i) => (
                          <li key={i}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Word Count &amp; Referencing</h3>
                    <p className="text-slate-600 dark:text-slate-300">{active.analysis_json.word_count_guidance}</p>
                    <p className="text-slate-600 dark:text-slate-300">{active.analysis_json.referencing_requirements}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-6">
                  Click &ldquo;Run AI Analysis&rdquo; to parse your assignment brief and uploaded rubrics.
                </p>
              )}
            </div>
          )}

          {/* STEP 4: EDITABLE ASSIGNMENT OUTLINE */}
          {step === 4 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                    Step 4. Editable Assignment Outline
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Total allocated:{' '}
                    <span className="font-mono-tabular font-semibold">
                      {sections.reduce((acc, s) => acc + (Number(s.target_words) || 0), 0)}
                    </span>{' '}
                    / {active.target_word_count} target words
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busyAction === 'outline'}
                    onClick={() =>
                      runAIAction(
                        'outline',
                        `/api/assignments/${active.id}/outline`,
                        {},
                        (data) => {
                          setSections(data.sections as AssignmentSection[]);
                          setStatusMsg('Structured outline generated.');
                        }
                      )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-60 cursor-pointer"
                  >
                    {busyAction === 'outline' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Generate Outline</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSections((prev) => [
                        ...prev,
                        {
                          id: `tmp_${Date.now()}`,
                          assignment_id: active.id,
                          order_index: prev.length,
                          heading: 'New Section',
                          subheadings: [],
                          suggested_content: '',
                          target_words: 250,
                          draft_content: '',
                        },
                      ])
                    }
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer"
                  >
                    + Add Section
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveOutline}
                    disabled={busyAction === 'saving-outline'}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium cursor-pointer"
                  >
                    Save Outline
                  </button>
                </div>
              </div>

              {sections.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-6">
                  Generate an outline with AI or click &ldquo;+ Add Section&rdquo; to structure your assignment manually.
                </p>
              ) : (
                <div className="space-y-4">
                  {sections.map((sec, idx) => (
                    <div
                      key={sec.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-3"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        <div className="md:col-span-7">
                          <input
                            type="text"
                            value={sec.heading}
                            onChange={(e) =>
                              setSections((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, heading: e.target.value } : s))
                              )
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium"
                          />
                        </div>
                        <div className="md:col-span-3 flex items-center gap-2">
                          <span className="text-xs text-slate-500 shrink-0">Words:</span>
                          <input
                            type="number"
                            value={sec.target_words}
                            onChange={(e) =>
                              setSections((prev) =>
                                prev.map((s, i) =>
                                  i === idx ? { ...s, target_words: Number(e.target.value) || 0 } : s
                                )
                              )
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono-tabular"
                          />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setSections((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-2 text-slate-400 hover:text-rose-500 cursor-pointer"
                            aria-label="Remove section"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        value={sec.suggested_content}
                        onChange={(e) =>
                          setSections((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, suggested_content: e.target.value } : s))
                          )
                        }
                        placeholder="Key arguments, evidence, or subheadings for this section..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: DRAFT GENERATION */}
          {step === 5 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                    Step 5. Structured Academic Draft Generation
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Generates academic prose grounded in your uploaded materials and saved references, flagging unverified claims.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyAction === 'draft-all'}
                  onClick={() =>
                    runAIAction(
                      'draft-all',
                      `/api/assignments/${active.id}/draft`,
                      {},
                      (data) => {
                        setActive(data.assignment as Assignment);
                        setStatusMsg('Full draft generated. Open Step 7 (Editor) to refine.');
                      }
                    )
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-60 cursor-pointer"
                >
                  {busyAction === 'draft-all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Generate Entire Draft</span>
                </button>
              </div>

              {sections.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Or Generate Individual Outline Sections
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sections.map((sec) => (
                      <div
                        key={sec.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{sec.heading}</p>
                          <p className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                            ~{sec.target_words} words {sec.draft_content ? '· Drafted' : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={busyAction === `draft-${sec.id}`}
                          onClick={() =>
                            runAIAction(
                              `draft-${sec.id}`,
                              `/api/assignments/${active.id}/draft`,
                              { sectionId: sec.id },
                              (data) => {
                                setActive(data.assignment as Assignment);
                                setSections(data.sections as AssignmentSection[]);
                                setStatusMsg(`Drafted "${sec.heading}".`);
                              }
                            )
                          }
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium shrink-0 cursor-pointer"
                        >
                          {busyAction === `draft-${sec.id}` ? 'Drafting...' : 'Draft Section'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {active.draft_markdown && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Current Draft Preview ({wordCount} words)
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(7)}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Edit in Rich Workspace
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700 dark:text-slate-300 max-h-72 overflow-y-auto leading-relaxed">
                    {active.draft_markdown}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: MARKING RUBRIC REVIEW */}
          {step === 6 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                    Step 6. Marking Rubric Alignment Review
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Compares your draft against marking criteria. Formative feedback only — never guarantees a grade.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyAction === 'rubric'}
                  onClick={() =>
                    runAIAction(
                      'rubric',
                      `/api/assignments/${active.id}/rubric-review`,
                      {},
                      (data) => {
                        setActive(data.assignment as Assignment);
                        setStatusMsg('Rubric alignment review complete.');
                      }
                    )
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-60 cursor-pointer"
                >
                  {busyAction === 'rubric' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Run Rubric Review</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Paste Marking Rubric Criteria (optional if rubric file uploaded)
                </label>
                <textarea
                  rows={3}
                  value={active.rubric_text}
                  onChange={(e) => setActive({ ...active, rubric_text: e.target.value })}
                  onBlur={() => saveAssignmentPatch({ rubric_text: active.rubric_text }, true)}
                  placeholder="e.g. Critical Evaluation (30%), Evidence & Literature (30%), Structure & Argument (20%), Academic Writing & Referencing (20%)"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                />
              </div>

              {active.rubric_review_json && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                    {active.rubric_review_json.disclaimer}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {active.rubric_review_json.overall_alignment}
                  </p>
                  <div className="space-y-3">
                    {active.rubric_review_json.criteria_reviews.map((c, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{c.criterion}</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          <strong>Addressed:</strong> {c.what_draft_addresses}
                        </p>
                        {c.missing_elements.length > 0 && (
                          <div className="text-xs text-rose-700 dark:text-rose-300">
                            <strong>Missing Elements:</strong> {c.missing_elements.join('; ')}
                          </div>
                        )}
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          <strong>Improvements:</strong> {c.areas_for_improvement}
                        </p>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300">
                          <strong>Suggested Revisions:</strong> {c.suggested_revisions}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 7: RICH DOCUMENT EDITOR */}
          {step === 7 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Section Navigation & AI Rewrite */}
              <div className="lg:col-span-4 space-y-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    Section Navigation
                  </h3>
                  {headingsList.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Add Markdown headings (#, ##, ###) to navigate sections quickly.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {headingsList.map((h) => (
                        <button
                          key={h.lineIdx}
                          type="button"
                          onClick={() => editorRef.current?.focus()}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 truncate cursor-pointer"
                        >
                          {h.line.replace(/^#+\s+/, '')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    AI Section Rewriter
                  </h3>
                  <textarea
                    rows={3}
                    value={rewriteTarget}
                    onChange={(e) => setRewriteTarget(e.target.value)}
                    placeholder="Paste a paragraph from your draft (or select text and click 'Load Selection')..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!editorRef.current || !active) return;
                      const sel = active.draft_markdown.slice(
                        editorRef.current.selectionStart,
                        editorRef.current.selectionEnd
                      );
                      if (sel.trim()) setRewriteTarget(sel);
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Load highlighted editor selection
                  </button>
                  <input
                    type="text"
                    value={rewriteInstruction}
                    onChange={(e) => setRewriteInstruction(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                  <button
                    type="button"
                    disabled={busyAction === 'rewrite' || !rewriteTarget.trim()}
                    onClick={handleRewriteSelection}
                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${busyAction === 'rewrite' ? 'animate-spin' : ''}`} />
                    <span>Rewrite &amp; Replace in Draft</span>
                  </button>
                </div>
              </div>

              {/* Editor Canvas */}
              <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950/50">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => applyFormat('# ')} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Heading 1">
                      <Heading1 className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => applyFormat('## ')} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Heading 2">
                      <Heading2 className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => applyFormat('**', '**')} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Bold">
                      <Bold className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => applyFormat('*', '*')} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Italic">
                      <Italic className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => applyFormat('- ')} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer" title="Bullet List">
                      <List className="w-4 h-4" />
                    </button>
                    <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-700" />
                    <button type="button" onClick={handleUndo} disabled={undoStack.length === 0} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer" title="Undo">
                      <Undo2 className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={handleRedo} disabled={redoStack.length === 0} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer" title="Redo">
                      <Redo2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                    {wordCount} words · Autosave on
                  </div>
                </div>
                <textarea
                  ref={editorRef}
                  rows={22}
                  value={active.draft_markdown}
                  onChange={(e) => updateDraftWithHistory(e.target.value)}
                  placeholder="Write or refine your assignment draft here..."
                  className="w-full p-5 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-none resize-y"
                />
              </div>
            </div>
          )}

          {/* STEP 8: FINAL REVIEW */}
          {step === 8 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                    Step 8. Final Pre-Submission Audit
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Checks grammar, spelling, clarity, citation integrity, rubric checklist, and word count.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyAction === 'final-review'}
                  onClick={() =>
                    runAIAction(
                      'final-review',
                      `/api/assignments/${active.id}/final-review`,
                      {},
                      (data) => {
                        setActive(data.assignment as Assignment);
                        setStatusMsg('Final pre-submission review complete.');
                      }
                    )
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-60 cursor-pointer"
                >
                  {busyAction === 'final-review' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Run Final Review</span>
                </button>
              </div>

              {active.final_review_json && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 md:col-span-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Word Count Check</p>
                      <p className="font-mono-tabular text-lg font-semibold text-slate-900 dark:text-white">
                        {active.final_review_json.word_count_actual} / {active.final_review_json.word_count_target} words
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{active.final_review_json.word_count_status}</p>
                  </div>

                  {[
                    { title: 'Grammar Review', items: active.final_review_json.grammar_issues },
                    { title: 'Spelling Review', items: active.final_review_json.spelling_issues },
                    { title: 'Clarity Suggestions', items: active.final_review_json.clarity_suggestions },
                    { title: 'Citation Review', items: active.final_review_json.citation_audit },
                  ].map((box) => (
                    <div key={box.title} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">{box.title}</h3>
                      {box.items.length === 0 ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">No issues flagged.</p>
                      ) : (
                        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                          {box.items.map((it, i) => (
                            <li key={i}>{it}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}

                  <div className="md:col-span-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Rubric Checklist</h3>
                    <div className="space-y-2">
                      {active.final_review_json.rubric_checklist.map((row, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs">
                          <span className={row.met ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                            {row.met ? '[MET]' : '[CHECK]'}
                          </span>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{row.item}</p>
                            <p className="text-slate-500 dark:text-slate-400">{row.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 9: EXPORT */}
          {step === 9 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  Step 9. Export Assignment Document
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Downloads are generated directly from your saved draft and project bibliography.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    format: 'docx' as const,
                    title: 'Microsoft Word (.docx)',
                    desc: 'Includes formatted headings, paragraphs, page numbers, and References.',
                  },
                  {
                    format: 'pdf' as const,
                    title: 'PDF Document (.pdf)',
                    desc: 'A4 margins, consistent typography, page numbering, and References.',
                  },
                  {
                    format: 'txt' as const,
                    title: 'Plain Text (.txt)',
                    desc: 'Clean unformatted academic text with metadata header.',
                  },
                ].map((opt) => (
                  <button
                    key={opt.format}
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={() => handleExport(opt.format)}
                    className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left transition-colors cursor-pointer flex flex-col justify-between gap-4"
                  >
                    <div>
                      <p className="font-display text-base font-semibold text-slate-900 dark:text-white">
                        {opt.title}
                      </p>
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{opt.desc}</p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      <Download className="w-4 h-4" />
                      <span>{busyAction === `export-${opt.format}` ? 'Preparing file...' : `Download ${opt.format.toUpperCase()}`}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
