import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckSquare,
  FileText,
  FolderKanban,
  GraduationCap,
  PenTool,
  Presentation,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { Assignment, PlannerTask, Project, StudyDocument, WorkspaceRoute } from '../types';

interface DashboardPageProps {
  onNavigate: (route: WorkspaceRoute) => void;
  onOpenAssignment: (assignmentId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenAssignment }) => {
  const { user, usage } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<{ projects: Project[] }>('/api/projects'),
      apiFetch<{ assignments: Assignment[] }>('/api/assignments'),
      apiFetch<{ tasks: PlannerTask[] }>('/api/planner'),
      apiFetch<{ documents: StudyDocument[] }>('/api/documents'),
    ])
      .then(([p, a, t, d]) => {
        setProjects(p.projects);
        setAssignments(a.assignments);
        setTasks(t.tasks);
        setDocuments(d.documents);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upcomingDeadlines = tasks.filter((t) => !t.completed).slice(0, 5);
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;

  const quickActions: {
    label: string;
    desc: string;
    route: WorkspaceRoute;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      label: 'Create Assignment',
      desc: 'Start a structured brief, outline & draft',
      route: 'assignment-studio',
      icon: FileText,
    },
    {
      label: 'Upload Study Notes',
      desc: 'Analyze PDF, DOCX, PPTX or TXT notes',
      route: 'notes-intelligence',
      icon: Upload,
    },
    {
      label: 'Humanize Text',
      desc: 'Refine academic clarity & flow',
      route: 'humanizer',
      icon: PenTool,
    },
    {
      label: 'Generate Quiz',
      desc: 'Build practice tests & flashcards',
      route: 'quiz-maker',
      icon: CheckSquare,
    },
    {
      label: 'Ask Genie',
      desc: 'Step-by-step Subject Tutor help',
      route: 'subject-tutor',
      icon: GraduationCap,
    },
    {
      label: 'Create Presentation',
      desc: 'Draft slides & export PPTX',
      route: 'presentation-maker',
      icon: Presentation,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome & Usage Strip */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            {user?.course || 'University Workspace'} · {user?.academic_level || 'Student'}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, {user?.full_name}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {user?.university ? `${user.university} · ` : ''}Default referencing: {user?.referencing_style || 'APA 7'}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Active Assignments</p>
            <p className="mt-1 font-mono-tabular text-xl font-semibold text-slate-900 dark:text-white">
              {assignments.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Uploaded Docs</p>
            <p className="mt-1 font-mono-tabular text-xl font-semibold text-slate-900 dark:text-white">
              {documents.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Study Tasks Done</p>
            <p className="mt-1 font-mono-tabular text-xl font-semibold text-slate-900 dark:text-white">
              {completedCount}/{totalTasks}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Daily AI Quota</p>
            <p className="mt-1 font-mono-tabular text-xl font-semibold text-indigo-600 dark:text-indigo-400">
              {usage ? `${usage.dailyUsed}/${usage.dailyLimit}` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <section>
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => onNavigate(action.route)}
                className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-indigo-500/60 dark:hover:border-indigo-500/60 transition-colors flex items-start justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-slate-900 dark:text-white">{action.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{action.desc}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0 mt-1" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Two-Column Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Assignments & Projects */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Active Assignments
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('assignment-studio')}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Open Studio
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No assignments started yet. Launch Assignment Studio to structure your next essay or report.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('assignment-studio')}
                  className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 cursor-pointer"
                >
                  Create First Assignment
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {assignments.slice(0, 5).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onOpenAssignment(a.id)}
                    className="w-full py-3 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {a.assignment_type} · {a.referencing_style} · Target {a.target_word_count} words
                      </p>
                    </div>
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 capitalize shrink-0">
                      {a.status.replace('_', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Recent Projects
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('projects')}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Manage Projects
              </button>
            </div>
            {projects.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Create course folders in My Projects to group assignments, notes, and references.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projects.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onNavigate('projects')}
                    className="text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <FolderKanban className="w-3.5 h-3.5" />
                      <span>{p.folder}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white truncate">{p.title}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines & Recent Documents */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Upcoming Deadlines
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Open Planner
              </button>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="py-6 text-center">
                <Calendar className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No upcoming tasks scheduled. Add exam dates or submission deadlines in Planner.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {upcomingDeadlines.map((task) => (
                  <div key={task.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{task.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {task.task_type} · Priority: {task.priority}
                      </p>
                    </div>
                    <span className="font-mono-tabular text-xs text-slate-600 dark:text-slate-300 shrink-0">
                      {task.due_date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Recent Study Documents
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('notes-intelligence')}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Analyze Notes
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="py-6 text-center">
                <BookOpen className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No documents uploaded yet. Supports PDF, DOCX, PPTX, and TXT.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {documents.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{doc.file_name}</p>
                      <p className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                        {doc.page_count} pages · {doc.word_count} words
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
