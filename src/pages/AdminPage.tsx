import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface AdminOverview {
  settings: {
    default_provider: 'gemini' | 'openrouter';
    default_model: string;
    fallback_provider: 'gemini' | 'openrouter' | 'none';
    fallback_model: string;
    daily_request_limit: number;
    max_response_tokens: number;
    max_file_size_mb: number;
    enabled_features: Record<string, boolean>;
  };
  analytics: {
    totalUsers: number;
    totalProjects: number;
    totalDocuments: number;
    totalAssignments: number;
    requestsToday: number;
    totalRequests: number;
    fallbackCount: number;
    errorCount: number;
    byProvider: Record<string, number>;
    recentLogs: {
      id: string;
      feature: string;
      provider: string;
      model: string;
      status: string;
      latency_ms: number;
      error_message: string;
      created_at: string;
    }[];
  };
  providers: { gemini: boolean; openrouter: boolean };
  availableModels: {
    gemini: { id: string; label: string }[];
    openrouter: { id: string; label: string }[];
  };
  database: { configured: boolean; mode: string };
}

export const AdminPage: React.FC = () => {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => {
    apiFetch<AdminOverview>('/api/admin/overview')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Access denied.'));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await apiFetch<{ settings: AdminOverview['settings'] }>('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(data.settings),
      });
      setData({ ...data, settings: res.settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-8 text-center text-sm text-rose-600 dark:text-rose-400">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-sm text-slate-500">Loading administrator console...</div>;
  }

  const s = data.settings;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-indigo-500" />
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Protected Administrator Console
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage free-tier AI providers, model routing, daily fair-use quotas, and system health.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Usage Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Students', val: data.analytics.totalUsers },
          { label: 'Assignments', val: data.analytics.totalAssignments },
          { label: 'Requests Today', val: data.analytics.requestsToday },
          { label: 'Fallback Recoveries', val: data.analytics.fallbackCount },
          { label: 'Provider Errors', val: data.analytics.errorCount },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">{m.label}</p>
            <p className="mt-1 font-mono-tabular text-2xl font-semibold text-slate-900 dark:text-white">{m.val}</p>
          </div>
        ))}
      </div>

      {/* Central AI Gateway Configuration */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Central Multi-AI Gateway Configuration
          </h3>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configuration updated</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 sm:col-span-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">Google Gemini Server Status: </span>
            <span className={data.providers.gemini ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600'}>
              {data.providers.gemini ? 'Configured (Free Tier)' : 'Awaiting GEMINI_API_KEY in Secrets'}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 sm:col-span-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">OpenRouter Server Status: </span>
            <span className={data.providers.openrouter ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600'}>
              {data.providers.openrouter ? 'Configured (Free Tier)' : 'Awaiting OPENROUTER_API_KEY in Server Env'}
            </span>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Default Provider</label>
            <select
              value={s.default_provider}
              onChange={(e) => {
                const p = e.target.value as 'gemini' | 'openrouter';
                setData({
                  ...data,
                  settings: {
                    ...s,
                    default_provider: p,
                    default_model: data.availableModels[p][0].id,
                  },
                });
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="gemini">Google Gemini</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Default Free Model</label>
            <select
              value={s.default_model}
              onChange={(e) => setData({ ...data, settings: { ...s, default_model: e.target.value } })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              {data.availableModels[s.default_provider].map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Fallback Provider</label>
            <select
              value={s.fallback_provider}
              onChange={(e) => {
                const p = e.target.value as 'gemini' | 'openrouter' | 'none';
                setData({
                  ...data,
                  settings: {
                    ...s,
                    fallback_provider: p,
                    fallback_model: p === 'none' ? '' : data.availableModels[p][0].id,
                  },
                });
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="openrouter">OpenRouter</option>
              <option value="gemini">Google Gemini</option>
              <option value="none">None</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Fallback Model</label>
            <select
              disabled={s.fallback_provider === 'none'}
              value={s.fallback_model}
              onChange={(e) => setData({ ...data, settings: { ...s, fallback_model: e.target.value } })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 disabled:opacity-50"
            >
              {s.fallback_provider !== 'none' &&
                data.availableModels[s.fallback_provider].map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Daily Student Limit</label>
            <input
              type="number"
              min={5}
              max={500}
              value={s.daily_request_limit}
              onChange={(e) =>
                setData({ ...data, settings: { ...s, daily_request_limit: Number(e.target.value) || 40 } })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Max Response Tokens</label>
            <input
              type="number"
              min={512}
              max={8192}
              value={s.max_response_tokens}
              onChange={(e) =>
                setData({ ...data, settings: { ...s, max_response_tokens: Number(e.target.value) || 4096 } })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Max Upload Size (MB)</label>
            <input
              type="number"
              min={1}
              max={20}
              value={s.max_file_size_mb}
              onChange={(e) =>
                setData({ ...data, settings: { ...s, max_file_size_mb: Number(e.target.value) || 10 } })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Feature Availability</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            {Object.entries(s.enabled_features).map(([key, enabled]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() =>
                    setData({
                      ...data,
                      settings: {
                        ...s,
                        enabled_features: { ...s.enabled_features, [key]: !enabled },
                      },
                    })
                  }
                />
                <span className="capitalize">{key.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Gateway Settings'}
          </button>
        </div>
      </form>

      {/* Recent Logs Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Recent AI Request &amp; Error Logs
        </h3>
        {data.analytics.recentLogs.length === 0 ? (
          <p className="text-xs text-slate-500">No AI requests recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2 pr-4">Feature</th>
                  <th className="py-2 pr-4">Provider</th>
                  <th className="py-2 pr-4">Model</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Latency</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {data.analytics.recentLogs.slice(0, 20).map((log) => (
                  <tr key={log.id} className="h-9">
                    <td className="py-2 pr-4 capitalize">{log.feature.replace('_', ' ')}</td>
                    <td className="py-2 pr-4">{log.provider}</td>
                    <td className="py-2 pr-4 font-mono-tabular">{log.model}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          log.status === 'error'
                            ? 'text-rose-600 dark:text-rose-400 font-medium'
                            : log.status === 'rate_limited'
                              ? 'text-amber-600 dark:text-amber-400 font-medium'
                              : 'text-emerald-600 dark:text-emerald-400 font-medium'
                        }
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right font-mono-tabular">{log.latency_ms}ms</td>
                    <td className="py-2 text-slate-500 truncate max-w-[240px]">{log.error_message || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
