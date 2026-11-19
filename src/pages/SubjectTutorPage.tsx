import React, { useEffect, useState } from 'react';
import { GraduationCap, Loader2, Plus, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { ChatMessage, Conversation } from '../types';

const DISCIPLINES: Record<string, string[]> = {
  'Information Technology': [
    'Programming',
    'Computer Science',
    'Networking',
    'Cybersecurity',
    'Databases',
    'Software Engineering',
  ],
  Business: [
    'Business Administration',
    'Marketing',
    'Management',
    'Accounting',
    'Finance',
    'Human Resources',
    'Entrepreneurship',
  ],
  'Social Sciences': ['Psychology', 'Sociology', 'Political Science', 'Communication'],
  'STEM & Other Disciplines': [
    'Engineering',
    'Mathematics',
    'Statistics',
    'Education',
    'Law',
    'Humanities',
    'Health Sciences',
  ],
};

const MODES = [
  'Step-by-step explanation',
  'Worked calculation with steps',
  'Code walkthrough & explanation',
  'Examples & analogies',
  'Practice problems & revision exercises',
];

export const SubjectTutorPage: React.FC = () => {
  const { refreshUsage } = useAuth();
  const [discipline, setDiscipline] = useState('Information Technology');
  const [subject, setSubject] = useState('Programming');
  const [mode, setMode] = useState(MODES[0]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ conversations: Conversation[] }>('/api/conversations?workspace=tutor')
      .then((res) => setConversations(res.conversations))
      .catch(() => {});
  }, []);

  const loadConversation = async (id: string) => {
    setConversationId(id);
    const res = await apiFetch<{ messages: ChatMessage[] }>(`/api/conversations/${id}/messages`);
    setMessages(res.messages);
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion('');
    setError('');
    setLoading(true);

    const tempMsg: ChatMessage = {
      id: `local_${Date.now()}`,
      conversation_id: conversationId || '',
      role: 'user',
      content: q,
      citations_json: [],
      provider_used: '',
      model_used: '',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await apiFetch<{ conversationId: string; message: ChatMessage }>('/api/tutor/ask', {
        method: 'POST',
        body: JSON.stringify({ discipline, subject, mode, question: q, conversationId }),
      });
      if (!conversationId) {
        setConversationId(res.conversationId);
        const convos = await apiFetch<{ conversations: Conversation[] }>('/api/conversations?workspace=tutor');
        setConversations(convos.conversations);
      }
      setMessages((prev) => [...prev, res.message]);
      await refreshUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tutor request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 space-y-5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Tutor Focus
            </h2>
            <button
              type="button"
              onClick={() => {
                setConversationId(undefined);
                setMessages([]);
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Session</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Discipline</label>
            <select
              value={discipline}
              onChange={(e) => {
                const d = e.target.value;
                setDiscipline(d);
                setSubject(DISCIPLINES[d][0]);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            >
              {Object.keys(DISCIPLINES).map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            >
              {DISCIPLINES[discipline].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Teaching Style</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            >
              {MODES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Sessions</h3>
          {conversations.length === 0 ? (
            <p className="text-xs text-slate-500">Your tutor sessions will appear here.</p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => loadConversation(c.id)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs truncate cursor-pointer ${
                    conversationId === c.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col h-[600px]">
        <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-500" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                {subject} Tutor
              </h2>
              <p className="text-[11px] text-slate-500">{discipline} · {mode}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Ask any concept, calculation, or code question
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
                For calculations, Genie shows every working step. For programming, Genie explains the logic line by line.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAsk} className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Ask your ${subject} tutor...`}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
