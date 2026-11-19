import React, { useEffect, useState } from 'react';
import { CheckCircle2, Database, Lock, Moon, Shield, Sun, Trash2 } from 'lucide-react';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../lib/api';
import type { UserProfile } from '../types';

export const SettingsPage: React.FC = () => {
  const { user, setUser, usage, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [university, setUniversity] = useState(user?.university || '');
  const [course, setCourse] = useState(user?.course || '');
  const [academicLevel, setAcademicLevel] = useState(user?.academic_level || 'Undergraduate');
  const [writingStyle, setWritingStyle] = useState(user?.writing_style || 'Natural academic English');
  const [referencingStyle, setReferencingStyle] = useState(user?.referencing_style || 'APA 7');
  const [country, setCountry] = useState(user?.country || '');
  const [interests, setInterests] = useState((user?.study_interests || []).join(', '));

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sysHealth, setSysHealth] = useState<{
    database: { configured: boolean; mode: string };
    providers: { gemini: boolean; openrouter: boolean };
  } | null>(null);

  useEffect(() => {
    apiFetch<{
      database: { configured: boolean; mode: string };
      providers: { gemini: boolean; openrouter: boolean };
    }>('/api/health')
      .then(setSysHealth)
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: fullName,
          university,
          course,
          academic_level: academicLevel,
          writing_style: writingStyle,
          referencing_style: referencingStyle,
          country,
          study_interests: interests
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          onboarding_completed: true,
        }),
      });
      setUser(res.user);
      setSavedMsg('Profile preferences updated.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    await apiFetch('/api/auth/account', { method: 'DELETE' });
    await logout();
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Profile & Preferences */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Student Profile &amp; Academic Preferences
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {user?.email} · Role: <span className="capitalize">{user?.role}</span>
            </p>
          </div>
          {savedMsg && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>{savedMsg}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              University / College (optional)
            </label>
            <input
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Course / Programme</label>
            <input
              type="text"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Academic Level</label>
            <select
              value={academicLevel}
              onChange={(e) => setAcademicLevel(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option>Foundation / Diploma</option>
              <option>Undergraduate</option>
              <option>Honours</option>
              <option>Postgraduate / Masters</option>
              <option>Doctoral / PhD</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Preferred Writing Style
            </label>
            <select
              value={writingStyle}
              onChange={(e) => setWritingStyle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option>Natural academic English</option>
              <option>Simple English</option>
              <option>Professional English</option>
              <option>Formal academic English</option>
              <option>Concise English</option>
              <option>Clear and readable English</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Preferred Referencing Style
            </label>
            <select
              value={referencingStyle}
              onChange={(e) => setReferencingStyle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option>APA 7</option>
              <option>Harvard</option>
              <option>MLA</option>
              <option>IEEE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Study Interests (comma-separated)
            </label>
            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>

      {/* Appearance & PWA */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Theme &amp; Mobile App Installation
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Switch between light and dark workspaces or install MG as a standalone PWA.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <PWAInstallButton variant="full" />
        </div>
      </div>

      {/* Fair-Use Usage & Database / Provider Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Shield className="w-4 h-4 text-indigo-500" />
            <span>Free AI Fair-Use Allowance</span>
          </div>
          <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
            <p className="font-mono-tabular">
              Today: <strong>{usage?.dailyUsed ?? 0}</strong> / {usage?.dailyLimit ?? 40} requests
            </p>
            <p className="font-mono-tabular">
              This month: <strong>{usage?.monthlyUsed ?? 0}</strong> requests
            </p>
            <p>
              Gemini Free Tier: {sysHealth?.providers.gemini ? 'Connected' : 'Awaiting GEMINI_API_KEY'}
            </p>
            <p>
              OpenRouter Free Fallback:{' '}
              {sysHealth?.providers.openrouter ? 'Connected' : 'Awaiting OPENROUTER_API_KEY'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Database className="w-4 h-4 text-indigo-500" />
            <span>Database &amp; Supabase Integration</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Storage Mode:{' '}
            <strong>
              {sysHealth?.database.configured
                ? 'Supabase PostgreSQL + RLS + Storage'
                : 'Local Persistent Relational Store (Awaiting Supabase Env Vars)'}
            </strong>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            To connect a free Supabase project, run <code className="font-mono-tabular">/supabase/schema.sql</code> and set <code className="font-mono-tabular">SUPABASE_URL</code>, <code className="font-mono-tabular">SUPABASE_ANON_KEY</code>, and <code className="font-mono-tabular">SUPABASE_SERVICE_ROLE_KEY</code> in server secrets.
          </p>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Lock className="w-4 h-4 text-indigo-500" />
          <span>Privacy &amp; External AI Processing Notice</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Your projects, assignments, and uploaded documents are stored privately for your account. When you run AI features, relevant prompt text and retrieved document excerpts are sent server-side to configured external providers (Google Gemini or OpenRouter) and processed subject to those providers&apos; terms and policies.
        </p>
      </div>

      {/* Account Deletion */}
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-400">Delete Account &amp; All Data</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Permanently removes your profile, projects, assignments, documents, and planner tasks.
          </p>
        </div>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs font-medium cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer"
            >
              Confirm Permanent Deletion
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
