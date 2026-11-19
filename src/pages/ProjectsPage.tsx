import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, FileText, FolderKanban, Plus, Search, Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { Assignment, Project, StudyDocument, WorkspaceRoute } from '../types';

interface ProjectsPageProps {
  onOpenAssignment: (assignmentId: string) => void;
  onNavigate: (route: WorkspaceRoute) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onOpenAssignment, onNavigate }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [documents, setDocuments] = useState<StudyDocument[]>([]);

  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [title, setTitle] = useState('');
  const [folder, setFolder] = useState('Semester 1');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<{ projects: Project[] }>('/api/projects'),
      apiFetch<{ assignments: Assignment[] }>('/api/assignments'),
      apiFetch<{ documents: StudyDocument[] }>('/api/documents'),
    ])
      .then(([p, a, d]) => {
        setProjects(p.projects);
        setAssignments(a.assignments);
        setDocuments(d.documents);
      })
      .catch(() => {});
  }, []);

  const folders = useMemo(
    () => ['All', ...Array.from(new Set(projects.map((p) => p.folder).filter(Boolean)))],
    [projects]
  );

  const filtered = useMemo(
    () =>
      projects.filter((p) => {
        const matchesFolder = selectedFolder === 'All' || p.folder === selectedFolder;
        const q = search.trim().toLowerCase();
        const matchesSearch =
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.subject.toLowerCase().includes(q) ||
          p.folder.toLowerCase().includes(q);
        return matchesFolder && matchesSearch;
      }),
    [projects, selectedFolder, search]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await apiFetch<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ title: title.trim(), folder: folder.trim() || 'General', subject, description }),
    });
    setProjects((prev) => [res.project, ...prev]);
    setTitle('');
    setSubject('');
    setDescription('');
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) {
      setEditingId(null);
      return;
    }
    const res = await apiFetch<{ project: Project }>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: renameValue.trim() }),
    });
    setProjects((prev) => prev.map((p) => (p.id === id ? res.project : p)));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Search & Folder Filters */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects, subjects, or folders..."
            className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {folders.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSelectedFolder(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                selectedFolder === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create Project */}
        <form
          onSubmit={handleCreate}
          className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 h-fit"
        >
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Create New Project
          </h2>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Project Name *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CS302 Distributed Systems Essay"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Folder</label>
              <input
                type="text"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="Semester 1"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Computer Science"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </button>
        </form>

        {/* Project Grid */}
        <div className="lg:col-span-8 space-y-4">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
              <FolderKanban className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No projects found. Create a project folder to organize your assignments and study materials.
              </p>
            </div>
          ) : (
            filtered.map((proj) => {
              const linkedAssignments = assignments.filter((a) => a.project_id === proj.id);
              const linkedDocs = documents.filter((d) => d.project_id === proj.id);
              return (
                <div
                  key={proj.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {proj.folder} {proj.subject ? `· ${proj.subject}` : ''}
                      </p>
                      {editingId === proj.id ? (
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="px-2.5 py-1 rounded border border-indigo-500 bg-white dark:bg-slate-950 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleRename(proj.id)}
                            className="px-2.5 py-1 rounded bg-indigo-600 text-white text-xs cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <h3 className="mt-0.5 font-display text-lg font-semibold text-slate-900 dark:text-white truncate">
                          {proj.title}
                        </h3>
                      )}
                      {proj.description && (
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{proj.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(proj.id);
                          setRenameValue(proj.title);
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-500 cursor-pointer"
                        aria-label="Rename project"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(proj.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                        aria-label="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                      {linkedAssignments.length} assignments · {linkedDocs.length} documents
                    </span>
                    <div className="flex items-center gap-3">
                      {linkedAssignments[0] ? (
                        <button
                          type="button"
                          onClick={() => onOpenAssignment(linkedAssignments[0].id)}
                          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Reopen Assignment</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigate('assignment-studio')}
                          className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer"
                        >
                          Start Assignment
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onNavigate('notes-intelligence')}
                        className="text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
                      >
                        Open Notes
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
