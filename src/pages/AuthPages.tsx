import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { MGLogo } from '../components/MGLogo';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { UserProfile, WorkspaceRoute } from '../types';

interface AuthPagesProps {
  mode: 'login' | 'register' | 'forgot-password' | 'onboarding';
  onNavigate: (route: WorkspaceRoute) => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({ mode, onNavigate }) => {
  const { user, setUser, refreshUsage } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Password reset state
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [tokenIssued, setTokenIssued] = useState(false);

  // Google Sign-In status
  const [googleStatus, setGoogleStatus] = useState<{ configured: boolean; message: string } | null>(null);

  // Onboarding state
  const [university, setUniversity] = useState(user?.university || '');
  const [course, setCourse] = useState(user?.course || '');
  const [academicLevel, setAcademicLevel] = useState(user?.academic_level || 'Undergraduate');
  const [writingStyle, setWritingStyle] = useState(user?.writing_style || 'Natural academic English');
  const [referencingStyle, setReferencingStyle] = useState(user?.referencing_style || 'APA 7');
  const [country, setCountry] = useState(user?.country || '');
  const [interestsInput, setInterestsInput] = useState((user?.study_interests || []).join(', '));

  useEffect(() => {
    apiFetch<{ configured: boolean; message: string }>('/api/auth/google-status')
      .then(setGoogleStatus)
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await apiFetch<{ user: UserProfile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      await refreshUsage();
      onNavigate(data.user.onboarding_completed ? 'dashboard' : 'onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await apiFetch<{ user: UserProfile }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      setUser(data.user);
      await refreshUsage();
      onNavigate('onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setSubmitting(true);
    try {
      const data = await apiFetch<{
        message: string;
        devResetToken?: string;
      }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setInfoMsg(data.message);
      setTokenIssued(true);
      if (data.devResetToken) {
        setResetToken(data.devResetToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not initiate reset.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await apiFetch<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      setInfoMsg(data.message);
      setTimeout(() => onNavigate('login'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const interests = interestsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const data = await apiFetch<{ user: UserProfile }>('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: fullName || user?.full_name,
          university,
          course,
          academic_level: academicLevel,
          writing_style: writingStyle,
          referencing_style: referencingStyle,
          country,
          study_interests: interests,
          onboarding_completed: true,
        }),
      });
      setUser(data.user);
      onNavigate('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save preferences.');
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'onboarding') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0B1120]">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <MGLogo />
            <span className="text-xs text-slate-500 dark:text-slate-400">Academic Profile Setup</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Personalize your academic workspace
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
            MG uses these preferences to tailor referencing styles, writing tone, and subject tutoring. You can update them anytime in Settings.
          </p>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleOnboardingSubmit} className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Student Name
              </label>
              <input
                type="text"
                required
                value={fullName || user?.full_name || ''}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                University or College (optional)
              </label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. University of Auckland"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Course or Programme
              </label>
              <input
                type="text"
                required
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. BSc Computer Science"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Academic Level
              </label>
              <select
                value={academicLevel}
                onChange={(e) => setAcademicLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option>Foundation / Diploma</option>
                <option>Undergraduate</option>
                <option>Honours</option>
                <option>Postgraduate / Masters</option>
                <option>Doctoral / PhD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Preferred Referencing Style
              </label>
              <select
                value={referencingStyle}
                onChange={(e) => setReferencingStyle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option>APA 7</option>
                <option>Harvard</option>
                <option>MLA</option>
                <option>IEEE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Preferred Writing Style
              </label>
              <select
                value={writingStyle}
                onChange={(e) => setWritingStyle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
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
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United Kingdom, Malaysia, USA"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Study Interests (comma-separated)
              </label>
              <input
                type="text"
                value={interestsInput}
                onChange={(e) => setInterestsInput(e.target.value)}
                placeholder="e.g. Machine Learning, Cybersecurity, Research Methods"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-60 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Save &amp; Enter Dashboard</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-slate-50 dark:bg-[#0B1120]">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to home</span>
        </button>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <MGLogo showSubtext />

          {mode === 'login' && (
            <>
              <h1 className="mt-6 font-display text-2xl font-bold text-slate-900 dark:text-white">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Sign in to access your saved projects, notes, and assignments.
              </p>
            </>
          )}

          {mode === 'register' && (
            <>
              <h1 className="mt-6 font-display text-2xl font-bold text-slate-900 dark:text-white">
                Create your free account
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Free access for students · Subject to daily fair-use AI limits.
              </p>
            </>
          )}

          {mode === 'forgot-password' && (
            <>
              <h1 className="mt-6 font-display text-2xl font-bold text-slate-900 dark:text-white">
                Reset your password
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Request a password recovery token for your student account.
              </p>
            </>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {infoMsg && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => onNavigate('forgot-password')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Sign In</span>
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@university.edu"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Password (minimum 8 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                By creating an account, you acknowledge that AI-powered study queries are sent server-side to configured external providers (Google Gemini or OpenRouter) for processing.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Create Account</span>
              </button>
            </form>
          )}

          {mode === 'forgot-password' && (
            <div className="mt-6 space-y-5">
              {!tokenIssued ? (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Registered Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium cursor-pointer"
                  >
                    {submitting ? 'Issuing token...' : 'Request Password Reset'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmReset} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Recovery Token
                    </label>
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      New Password (min 8 chars)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium cursor-pointer"
                  >
                    {submitting ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              )}
            </div>
          )}

          {(mode === 'login' || mode === 'register') && googleStatus && (
            <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-indigo-500 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    Google Sign-In {googleStatus.configured ? 'Available' : 'Awaiting Supabase OAuth Config'}
                  </p>
                  <p className="mt-0.5">{googleStatus.message}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400">
            {mode === 'login' ? (
              <>
                New to MG?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer"
                >
                  Create a free student account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
