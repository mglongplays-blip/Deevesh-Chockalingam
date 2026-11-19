import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  AIProviderSettingsRecord,
  AssignmentRecord,
  AssignmentSectionRecord,
  ConversationRecord,
  DocumentChunkRecord,
  DocumentRecord,
  MessageRecord,
  PasswordResetToken,
  PlannerTaskRecord,
  ProfileRecord,
  ProjectRecord,
  QuizRecord,
  QuizResultRecord,
  ReferenceRecord,
  UsageLogRecord,
} from '../types.ts';

interface LocalDatabase {
  profiles: ProfileRecord[];
  password_reset_tokens: PasswordResetToken[];
  projects: ProjectRecord[];
  documents: DocumentRecord[];
  document_chunks: DocumentChunkRecord[];
  assignments: AssignmentRecord[];
  assignment_sections: AssignmentSectionRecord[];
  conversations: ConversationRecord[];
  messages: MessageRecord[];
  references: ReferenceRecord[];
  quizzes: QuizRecord[];
  quiz_results: QuizResultRecord[];
  planner_tasks: PlannerTaskRecord[];
  usage_logs: UsageLogRecord[];
  ai_provider_settings: AIProviderSettingsRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'mg-db.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

function defaultSettings(): AIProviderSettingsRecord {
  return {
    id: 'default',
    default_provider: 'gemini',
    default_model: 'gemini-4-hydrogen',
    fallback_provider: 'openrouter',
    fallback_model: 'meta-llama/llama-3.3-70b-instruct:free',
    daily_request_limit: 40,
    max_response_tokens: 4096,
    max_file_size_mb: 10,
    enabled_features: {
      assignment_studio: true,
      notes_intelligence: true,
      humanizer: true,
      quiz_maker: true,
      presentation_maker: true,
      subject_tutor: true,
    },
    feature_model_overrides: {},
    updated_at: new Date().toISOString(),
  };
}

function emptyDb(): LocalDatabase {
  return {
    profiles: [],
    password_reset_tokens: [],
    projects: [],
    documents: [],
    document_chunks: [],
    assignments: [],
    assignment_sections: [],
    conversations: [],
    messages: [],
    references: [],
    quizzes: [],
    quiz_results: [],
    planner_tasks: [],
    usage_logs: [],
    ai_provider_settings: [defaultSettings()],
  };
}

function ensureLocalDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let cachedDb: LocalDatabase | null = null;

function readLocalDb(): LocalDatabase {
  ensureLocalDirs();
  if (cachedDb) return cachedDb;
  if (!fs.existsSync(DB_FILE)) {
    const init = emptyDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(init, null, 2), 'utf-8');
    cachedDb = init;
    return cachedDb;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<LocalDatabase>;
    const base = emptyDb();
    cachedDb = {
      ...base,
      ...parsed,
      ai_provider_settings:
        parsed.ai_provider_settings && parsed.ai_provider_settings.length > 0
          ? parsed.ai_provider_settings
          : base.ai_provider_settings,
    };
    return cachedDb;
  } catch {
    const init = emptyDb();
    cachedDb = init;
    return cachedDb;
  }
}

function writeLocalDb(db: LocalDatabase) {
  ensureLocalDirs();
  cachedDb = db;
  const tmpFile = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function getSupabaseConfigStatus() {
  const url = process.env.SUPABASE_URL?.trim() || '';
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim() || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  const configured = Boolean(url && serviceKey && !url.includes('MY_SUPABASE'));
  return {
    configured,
    hasAnonKey: Boolean(anonKey),
    mode: configured ? ('supabase' as const) : ('local_persistent' as const),
  };
}

let supabaseAdminClient: SupabaseClient | null = null;
export function getSupabaseAdmin(): SupabaseClient | null {
  const status = getSupabaseConfigStatus();
  if (!status.configured) return null;
  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(
      process.env.SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return supabaseAdminClient;
}

export const dbStore = {
  newId: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),

  // Profiles
  async findProfileByEmail(email: string): Promise<ProfileRecord | null> {
    const normalized = email.trim().toLowerCase();
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb.from('profiles').select('*').eq('email', normalized).maybeSingle();
      if (data) return data as ProfileRecord;
    }
    const db = readLocalDb();
    return db.profiles.find((p) => p.email.toLowerCase() === normalized) || null;
  },

  async findProfileById(id: string): Promise<ProfileRecord | null> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
      if (data) return data as ProfileRecord;
    }
    const db = readLocalDb();
    return db.profiles.find((p) => p.id === id) || null;
  },

  async countProfiles(): Promise<number> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { count } = await sb.from('profiles').select('*', { count: 'exact', head: true });
      if (typeof count === 'number') return count;
    }
    return readLocalDb().profiles.length;
  },

  async createProfile(profile: ProfileRecord): Promise<ProfileRecord> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { password_hash: _ph, ...sbPayload } = profile;
      const { data, error } = await sb.from('profiles').upsert(sbPayload).select().single();
      if (!error && data) return data as ProfileRecord;
    }
    const db = readLocalDb();
    db.profiles.push(profile);
    writeLocalDb(db);
    return profile;
  },

  async updateProfile(id: string, patch: Partial<ProfileRecord>): Promise<ProfileRecord | null> {
    const updatedAt = new Date().toISOString();
    const sb = getSupabaseAdmin();
    if (sb) {
      const { password_hash: _ph, ...safePatch } = patch;
      const { data, error } = await sb
        .from('profiles')
        .update({ ...safePatch, updated_at: updatedAt })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data as ProfileRecord;
    }
    const db = readLocalDb();
    const idx = db.profiles.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    db.profiles[idx] = { ...db.profiles[idx], ...patch, updated_at: updatedAt };
    writeLocalDb(db);
    return db.profiles[idx];
  },

  async deleteUserAndAllData(userId: string): Promise<void> {
    const sb = getSupabaseAdmin();
    if (sb) {
      await sb.from('profiles').delete().eq('id', userId);
    }
    const db = readLocalDb();
    const userDocs = db.documents.filter((d) => d.user_id === userId);
    for (const doc of userDocs) {
      try {
        const fullPath = path.resolve(UPLOADS_DIR, doc.storage_path);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      } catch {
        // Ignore cleanup errors
      }
    }
    db.profiles = db.profiles.filter((p) => p.id !== userId);
    db.password_reset_tokens = db.password_reset_tokens.filter((t) => t.user_id !== userId);
    db.projects = db.projects.filter((p) => p.user_id !== userId);
    db.documents = db.documents.filter((d) => d.user_id !== userId);
    db.document_chunks = db.document_chunks.filter((c) => c.user_id !== userId);
    db.assignments = db.assignments.filter((a) => a.user_id !== userId);
    db.assignment_sections = db.assignment_sections.filter((s) => s.user_id !== userId);
    db.conversations = db.conversations.filter((c) => c.user_id !== userId);
    db.messages = db.messages.filter((m) => m.user_id !== userId);
    db.references = db.references.filter((r) => r.user_id !== userId);
    db.quizzes = db.quizzes.filter((q) => q.user_id !== userId);
    db.quiz_results = db.quiz_results.filter((r) => r.user_id !== userId);
    db.planner_tasks = db.planner_tasks.filter((t) => t.user_id !== userId);
    db.usage_logs = db.usage_logs.filter((u) => u.user_id !== userId);
    writeLocalDb(db);
  },

  // Password Reset Tokens
  async createResetToken(record: PasswordResetToken): Promise<void> {
    const db = readLocalDb();
    db.password_reset_tokens.push(record);
    writeLocalDb(db);
  },

  async findValidResetToken(tokenHash: string): Promise<PasswordResetToken | null> {
    const db = readLocalDb();
    const now = Date.now();
    return (
      db.password_reset_tokens.find(
        (t) => t.token_hash === tokenHash && !t.used && new Date(t.expires_at).getTime() > now
      ) || null
    );
  },

  async markResetTokenUsed(id: string): Promise<void> {
    const db = readLocalDb();
    const item = db.password_reset_tokens.find((t) => t.id === id);
    if (item) {
      item.used = true;
      writeLocalDb(db);
    }
  },

  // Projects
  async listProjects(userId: string): Promise<ProjectRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (data) return data as ProjectRecord[];
    }
    return readLocalDb()
      .projects.filter((p) => p.user_id === userId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },

  async createProject(project: ProjectRecord): Promise<ProjectRecord> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb.from('projects').insert(project).select().single();
      if (!error && data) return data as ProjectRecord;
    }
    const db = readLocalDb();
    db.projects.push(project);
    writeLocalDb(db);
    return project;
  },

  async updateProject(userId: string, id: string, patch: Partial<ProjectRecord>): Promise<ProjectRecord | null> {
    const updatedAt = new Date().toISOString();
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb
        .from('projects')
        .update({ ...patch, updated_at: updatedAt })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .maybeSingle();
      if (data) return data as ProjectRecord;
    }
    const db = readLocalDb();
    const idx = db.projects.findIndex((p) => p.id === id && p.user_id === userId);
    if (idx === -1) return null;
    db.projects[idx] = { ...db.projects[idx], ...patch, updated_at: updatedAt };
    writeLocalDb(db);
    return db.projects[idx];
  },

  async deleteProject(userId: string, id: string): Promise<boolean> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { error } = await sb.from('projects').delete().eq('id', id).eq('user_id', userId);
      if (!error) return true;
    }
    const db = readLocalDb();
    const before = db.projects.length;
    db.projects = db.projects.filter((p) => !(p.id === id && p.user_id === userId));
    db.documents.forEach((d) => {
      if (d.user_id === userId && d.project_id === id) d.project_id = null;
    });
    db.assignments.forEach((a) => {
      if (a.user_id === userId && a.project_id === id) a.project_id = null;
    });
    writeLocalDb(db);
    return db.projects.length < before;
  },

  // Documents & Chunks
  async listDocuments(userId: string, projectId?: string): Promise<DocumentRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      let query = sb.from('documents').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (projectId) query = query.eq('project_id', projectId);
      const { data } = await query;
      if (data) return data as DocumentRecord[];
    }
    return readLocalDb()
      .documents.filter((d) => d.user_id === userId && (!projectId || d.project_id === projectId))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async getDocument(userId: string, id: string): Promise<DocumentRecord | null> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb.from('documents').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
      if (data) return data as DocumentRecord;
    }
    return readLocalDb().documents.find((d) => d.id === id && d.user_id === userId) || null;
  },

  async createDocument(doc: DocumentRecord, chunks: DocumentChunkRecord[]): Promise<DocumentRecord> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb.from('documents').insert(doc).select().single();
      if (!error && data) {
        if (chunks.length > 0) {
          await sb.from('document_chunks').insert(chunks);
        }
        return data as DocumentRecord;
      }
    }
    const db = readLocalDb();
    db.documents.push(doc);
    db.document_chunks.push(...chunks);
    writeLocalDb(db);
    return doc;
  },

  async listChunksForDocuments(userId: string, documentIds: string[]): Promise<DocumentChunkRecord[]> {
    if (documentIds.length === 0) return [];
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb
        .from('document_chunks')
        .select('*')
        .eq('user_id', userId)
        .in('document_id', documentIds)
        .order('chunk_index', { ascending: true });
      if (data) return data as DocumentChunkRecord[];
    }
    const set = new Set(documentIds);
    return readLocalDb()
      .document_chunks.filter((c) => c.user_id === userId && set.has(c.document_id))
      .sort((a, b) => a.chunk_index - b.chunk_index);
  },

  async deleteDocument(userId: string, id: string): Promise<boolean> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const existing = await this.getDocument(userId, id);
      if (existing) {
        await sb.storage.from('mg-documents').remove([existing.storage_path]);
      }
      const { error } = await sb.from('documents').delete().eq('id', id).eq('user_id', userId);
      if (!error) return true;
    }
    const db = readLocalDb();
    const doc = db.documents.find((d) => d.id === id && d.user_id === userId);
    if (!doc) return false;
    try {
      const fullPath = path.resolve(UPLOADS_DIR, doc.storage_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch {
      // ignore
    }
    db.documents = db.documents.filter((d) => !(d.id === id && d.user_id === userId));
    db.document_chunks = db.document_chunks.filter((c) => !(c.document_id === id && c.user_id === userId));
    writeLocalDb(db);
    return true;
  },

  // Assignments & Sections
  async listAssignments(userId: string): Promise<AssignmentRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb
        .from('assignments')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (data) return data as AssignmentRecord[];
    }
    return readLocalDb()
      .assignments.filter((a) => a.user_id === userId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },

  async getAssignment(userId: string, id: string): Promise<AssignmentRecord | null> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb.from('assignments').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
      if (data) return data as AssignmentRecord;
    }
    return readLocalDb().assignments.find((a) => a.id === id && a.user_id === userId) || null;
  },

  async createAssignment(assignment: AssignmentRecord): Promise<AssignmentRecord> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb.from('assignments').insert(assignment).select().single();
      if (!error && data) return data as AssignmentRecord;
    }
    const db = readLocalDb();
    db.assignments.push(assignment);
    writeLocalDb(db);
    return assignment;
  },

  async updateAssignment(
    userId: string,
    id: string,
    patch: Partial<AssignmentRecord>
  ): Promise<AssignmentRecord | null> {
    const updatedAt = new Date().toISOString();
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb
        .from('assignments')
        .update({ ...patch, updated_at: updatedAt })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .maybeSingle();
      if (data) return data as AssignmentRecord;
    }
    const db = readLocalDb();
    const idx = db.assignments.findIndex((a) => a.id === id && a.user_id === userId);
    if (idx === -1) return null;
    db.assignments[idx] = { ...db.assignments[idx], ...patch, updated_at: updatedAt };
    writeLocalDb(db);
    return db.assignments[idx];
  },

  async deleteAssignment(userId: string, id: string): Promise<boolean> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { error } = await sb.from('assignments').delete().eq('id', id).eq('user_id', userId);
      if (!error) return true;
    }
    const db = readLocalDb();
    const before = db.assignments.length;
    db.assignments = db.assignments.filter((a) => !(a.id === id && a.user_id === userId));
    db.assignment_sections = db.assignment_sections.filter((s) => !(s.assignment_id === id && s.user_id === userId));
    writeLocalDb(db);
    return db.assignments.length < before;
  },

  async listAssignmentSections(userId: string, assignmentId: string): Promise<AssignmentSectionRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb
        .from('assignment_sections')
        .select('*')
        .eq('user_id', userId)
        .eq('assignment_id', assignmentId)
        .order('order_index', { ascending: true });
      if (data) return data as AssignmentSectionRecord[];
    }
    return readLocalDb()
      .assignment_sections.filter((s) => s.user_id === userId && s.assignment_id === assignmentId)
      .sort((a, b) => a.order_index - b.order_index);
  },

  async replaceAssignmentSections(
    userId: string,
    assignmentId: string,
    sections: AssignmentSectionRecord[]
  ): Promise<AssignmentSectionRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      await sb.from('assignment_sections').delete().eq('user_id', userId).eq('assignment_id', assignmentId);
      if (sections.length > 0) {
        await sb.from('assignment_sections').insert(sections);
      }
      return sections;
    }
    const db = readLocalDb();
    db.assignment_sections = db.assignment_sections.filter(
      (s) => !(s.user_id === userId && s.assignment_id === assignmentId)
    );
    db.assignment_sections.push(...sections);
    writeLocalDb(db);
    return sections;
  },

  // Conversations & Messages
  async listConversations(userId: string, workspace?: string): Promise<ConversationRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      let q = sb.from('conversations').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
      if (workspace) q = q.eq('workspace', workspace);
      const { data } = await q;
      if (data) return data as ConversationRecord[];
    }
    return readLocalDb()
      .conversations.filter((c) => c.user_id === userId && (!workspace || c.workspace === workspace))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },

  async createConversation(convo: ConversationRecord): Promise<ConversationRecord> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb.from('conversations').insert(convo).select().single();
      if (!error && data) return data as ConversationRecord;
    }
    const db = readLocalDb();
    db.conversations.push(convo);
    writeLocalDb(db);
    return convo;
  },

  async listMessages(userId: string, conversationId: string): Promise<MessageRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (data) return data as MessageRecord[];
    }
    return readLocalDb()
      .messages.filter((m) => m.user_id === userId && m.conversation_id === conversationId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  async createMessage(msg: MessageRecord): Promise<MessageRecord> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb.from('messages').insert(msg).select().single();
      if (!error && data) {
        await sb
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', msg.conversation_id)
          .eq('user_id', msg.user_id);
        return data as MessageRecord;
      }
    }
    const db = readLocalDb();
    db.messages.push(msg);
    const convo = db.conversations.find((c) => c.id === msg.conversation_id && c.user_id === msg.user_id);
    if (convo) convo.updated_at = new Date().toISOString();
    writeLocalDb(db);
    return msg;
  },

  // References
  async listReferences(userId: string, projectId?: string): Promise<ReferenceRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      let q = sb.from('references').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data } = await q;
      if (data) return data as ReferenceRecord[];
    }
    return readLocalDb()
      .references.filter((r) => r.user_id === userId && (!projectId || r.project_id === projectId))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async createReference(ref: ReferenceRecord): Promise<ReferenceRecord> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb.from('references').insert(ref).select().single();
      if (!error && data) return data as ReferenceRecord;
    }
    const db = readLocalDb();
    db.references.push(ref);
    writeLocalDb(db);
    return ref;
  },

  async updateReference(userId: string, id: string, patch: Partial<ReferenceRecord>): Promise<ReferenceRecord | null> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb
        .from('references')
        .update(patch)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .maybeSingle();
      if (data) return data as ReferenceRecord;
    }
    const db = readLocalDb();
    const idx = db.references.findIndex((r) => r.id === id && r.user_id === userId);
    if (idx === -1) return null;
    db.references[idx] = { ...db.references[idx], ...patch };
    writeLocalDb(db);
    return db.references[idx];
  },

  async deleteReference(userId: string, id: string): Promise<boolean> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { error } = await sb.from('references').delete().eq('id', id).eq('user_id', userId);
      if (!error) return true;
    }
    const db = readLocalDb();
    const before = db.references.length;
    db.references = db.references.filter((r) => !(r.id === id && r.user_id === userId));
    writeLocalDb(db);
    return db.references.length < before;
  },

  // Quizzes & Results
  async listQuizzes(userId: string): Promise<QuizRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb
        .from('quizzes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (data) return data as QuizRecord[];
    }
    return readLocalDb()
      .quizzes.filter((q) => q.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async getQuiz(userId: string, id: string): Promise<QuizRecord | null> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb.from('quizzes').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
      if (data) return data as QuizRecord;
    }
    return readLocalDb().quizzes.find((q) => q.id === id && q.user_id === userId) || null;
  },

  async createQuiz(quiz: QuizRecord): Promise<QuizRecord> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb.from('quizzes').insert(quiz).select().single();
      if (!error && data) return data as QuizRecord;
    }
    const db = readLocalDb();
    db.quizzes.push(quiz);
    writeLocalDb(db);
    return quiz;
  },

  async listQuizResults(userId: string): Promise<QuizResultRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb
        .from('quiz_results')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });
      if (data) return data as QuizResultRecord[];
    }
    return readLocalDb()
      .quiz_results.filter((r) => r.user_id === userId)
      .sort((a, b) => b.completed_at.localeCompare(a.completed_at));
  },

  async createQuizResult(res: QuizResultRecord): Promise<QuizResultRecord> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb.from('quiz_results').insert(res).select().single();
      if (!error && data) return data as QuizResultRecord;
    }
    const db = readLocalDb();
    db.quiz_results.push(res);
    writeLocalDb(db);
    return res;
  },

  // Planner Tasks
  async listPlannerTasks(userId: string): Promise<PlannerTaskRecord[]> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb
        .from('planner_tasks')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });
      if (data) return data as PlannerTaskRecord[];
    }
    return readLocalDb()
      .planner_tasks.filter((t) => t.user_id === userId)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
  },

  async createPlannerTask(task: PlannerTaskRecord): Promise<PlannerTaskRecord> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data, error } = await sb.from('planner_tasks').insert(task).select().single();
      if (!error && data) return data as PlannerTaskRecord;
    }
    const db = readLocalDb();
    db.planner_tasks.push(task);
    writeLocalDb(db);
    return task;
  },

  async updatePlannerTask(
    userId: string,
    id: string,
    patch: Partial<PlannerTaskRecord>
  ): Promise<PlannerTaskRecord | null> {
    const updatedAt = new Date().toISOString();
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb
        .from('planner_tasks')
        .update({ ...patch, updated_at: updatedAt })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .maybeSingle();
      if (data) return data as PlannerTaskRecord;
    }
    const db = readLocalDb();
    const idx = db.planner_tasks.findIndex((t) => t.id === id && t.user_id === userId);
    if (idx === -1) return null;
    db.planner_tasks[idx] = { ...db.planner_tasks[idx], ...patch, updated_at: updatedAt };
    writeLocalDb(db);
    return db.planner_tasks[idx];
  },

  async deletePlannerTask(userId: string, id: string): Promise<boolean> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { error } = await sb.from('planner_tasks').delete().eq('id', id).eq('user_id', userId);
      if (!error) return true;
    }
    const db = readLocalDb();
    const before = db.planner_tasks.length;
    db.planner_tasks = db.planner_tasks.filter((t) => !(t.id === id && t.user_id === userId));
    writeLocalDb(db);
    return db.planner_tasks.length < before;
  },

  // Usage Logs & AI Provider Settings
  async createUsageLog(log: UsageLogRecord): Promise<void> {
    const sb = getSupabaseAdmin();
    if (sb) {
      await sb.from('usage_logs').insert(log);
    }
    const db = readLocalDb();
    db.usage_logs.push(log);
    // Cap local log array to 5000 most recent entries to avoid unbounded file growth
    if (db.usage_logs.length > 5000) {
      db.usage_logs = db.usage_logs.slice(-5000);
    }
    writeLocalDb(db);
  },

  async getUserUsageStats(userId: string): Promise<{ dailyUsed: number; monthlyUsed: number; recentLogs: UsageLogRecord[] }> {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const logs = readLocalDb().usage_logs.filter((l) => l.user_id === userId);
    const successfulOrAttempted = logs.filter((l) => l.status !== 'rate_limited');
    const dailyUsed = successfulOrAttempted.filter((l) => l.created_at >= startOfDay).length;
    const monthlyUsed = successfulOrAttempted.filter((l) => l.created_at >= startOfMonth).length;
    return {
      dailyUsed,
      monthlyUsed,
      recentLogs: logs.slice(-20).reverse(),
    };
  },

  async getAISettings(): Promise<AIProviderSettingsRecord> {
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb.from('ai_provider_settings').select('*').eq('id', 'default').maybeSingle();
      if (data) return data as AIProviderSettingsRecord;
    }
    const db = readLocalDb();
    return db.ai_provider_settings[0] || defaultSettings();
  },

  async updateAISettings(patch: Partial<AIProviderSettingsRecord>): Promise<AIProviderSettingsRecord> {
    const current = await this.getAISettings();
    const next: AIProviderSettingsRecord = {
      ...current,
      ...patch,
      enabled_features: {
        ...current.enabled_features,
        ...(patch.enabled_features || {}),
      },
      feature_model_overrides: {
        ...current.feature_model_overrides,
        ...(patch.feature_model_overrides || {}),
      },
      id: 'default',
      updated_at: new Date().toISOString(),
    };
    const sb = getSupabaseAdmin();
    if (sb) {
      await sb.from('ai_provider_settings').upsert(next);
    }
    const db = readLocalDb();
    db.ai_provider_settings = [next];
    writeLocalDb(db);
    return next;
  },

  async getAdminAnalytics() {
    const db = readLocalDb();
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const logs = db.usage_logs;
    const todayLogs = logs.filter((l) => l.created_at >= startOfDay);
    const errors = logs.filter((l) => l.status === 'error');
    const fallbacks = logs.filter((l) => l.status === 'fallback_success');
    const byProvider: Record<string, number> = {};
    for (const l of logs) {
      byProvider[l.provider] = (byProvider[l.provider] || 0) + 1;
    }
    return {
      totalUsers: db.profiles.length,
      totalProjects: db.projects.length,
      totalDocuments: db.documents.length,
      totalAssignments: db.assignments.length,
      requestsToday: todayLogs.length,
      totalRequests: logs.length,
      fallbackCount: fallbacks.length,
      errorCount: errors.length,
      byProvider,
      recentLogs: logs.slice(-50).reverse(),
      recentErrors: errors.slice(-20).reverse(),
    };
  },
};
