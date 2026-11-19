import React, { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Circle, List, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { PlannerTask } from '../types';

export const PlannerPage: React.FC = () => {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState<'all' | 'assignment' | 'exam' | 'study'>('all');

  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<PlannerTask['task_type']>('assignment');
  const [priority, setPriority] = useState<PlannerTask['priority']>('medium');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    apiFetch<{ tasks: PlannerTask[] }>('/api/planner')
      .then((res) => setTasks(res.tasks))
      .catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await apiFetch<{ task: PlannerTask }>('/api/planner', {
      method: 'POST',
      body: JSON.stringify({
        title: title.trim(),
        task_type: taskType,
        priority,
        due_date: dueDate,
        time_slot: timeSlot,
        notes,
      }),
    });
    setTasks((prev) => [...prev, res.task].sort((a, b) => a.due_date.localeCompare(b.due_date)));
    setTitle('');
    setTimeSlot('');
    setNotes('');
  };

  const toggleCompleted = async (task: PlannerTask) => {
    const res = await apiFetch<{ task: PlannerTask }>(`/api/planner/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !task.completed }),
    });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? res.task : t)));
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/planner/${id}`, { method: 'DELETE' });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const filteredTasks = useMemo(
    () => (filter === 'all' ? tasks : tasks.filter((t) => t.task_type === filter)),
    [tasks, filter]
  );

  const completedCount = tasks.filter((t) => t.completed).length;

  // Current month calendar grid
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOffset = new Date(year, month, 1).getDay();

  return (
    <div className="space-y-6">
      {/* Progress & View Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Academic Planner &amp; Study Timetable
          </h2>
          <p className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {completedCount} of {tasks.length} tasks completed
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(['all', 'assignment', 'exam', 'study'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize cursor-pointer ${
                  filter === f
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium cursor-pointer ${
                view === 'list' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium cursor-pointer ${
                view === 'calendar' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Add Task Form */}
        <form
          onSubmit={handleCreate}
          className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 h-fit"
        >
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Schedule Task or Deadline</h3>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Submit Literature Review Draft"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as PlannerTask['task_type'])}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              >
                <option value="assignment">Assignment</option>
                <option value="exam">Examination</option>
                <option value="study">Study Session</option>
                <option value="personal">Personal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PlannerTask['priority'])}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Time Slot</label>
              <input
                type="text"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                placeholder="e.g. 14:00 - 16:00"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add to Planner</span>
          </button>
        </form>

        {/* List or Calendar View */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          {view === 'list' ? (
            filteredTasks.length === 0 ? (
              <p className="text-sm text-slate-500 py-10 text-center">
                No tasks in this view. Add an assignment deadline, exam date, or study block on the left.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredTasks.map((task) => (
                  <div key={task.id} className="py-3.5 flex items-start justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => toggleCompleted(task)}
                      className="flex items-start gap-3 text-left flex-1 min-w-0 cursor-pointer"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            task.completed
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="capitalize">{task.task_type}</span> ·{' '}
                          <span
                            className={
                              task.priority === 'high'
                                ? 'text-rose-600 dark:text-rose-400 font-medium'
                                : task.priority === 'medium'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : ''
                            }
                          >
                            {task.priority} priority
                          </span>
                          {task.time_slot ? ` · ${task.time_slot}` : ''}
                        </p>
                        {task.notes && <p className="text-xs text-slate-500 mt-1">{task.notes}</p>}
                      </div>
                    </button>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono-tabular text-xs text-slate-600 dark:text-slate-300">
                        {task.due_date}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(task.id)}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                        aria-label="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-4">
                {today.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-slate-500 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: firstDayOffset }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[76px] rounded-lg bg-slate-50/50 dark:bg-slate-950/30" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayTasks = filteredTasks.filter((t) => t.due_date === iso);
                  return (
                    <div
                      key={iso}
                      className="min-h-[76px] rounded-lg border border-slate-200 dark:border-slate-800 p-1.5 text-left"
                    >
                      <span className="font-mono-tabular text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {dayNum}
                      </span>
                      <div className="mt-1 space-y-1">
                        {dayTasks.slice(0, 2).map((dt) => (
                          <div
                            key={dt.id}
                            className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                              dt.completed
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 line-through'
                                : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200'
                            }`}
                          >
                            {dt.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
