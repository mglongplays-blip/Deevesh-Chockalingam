-- MG - Meet Genie: Complete Supabase PostgreSQL Schema & Row Level Security
-- Includes all 14 core tables, indexes, constraints, RLS policies, and Storage rules.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  university TEXT,
  course TEXT,
  academic_level TEXT DEFAULT 'Undergraduate',
  writing_style TEXT DEFAULT 'Natural academic English',
  referencing_style TEXT DEFAULT 'APA 7',
  country TEXT DEFAULT '',
  study_interests TEXT[] DEFAULT '{}',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  folder TEXT NOT NULL DEFAULT 'General',
  subject TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects(user_id, updated_at DESC);

-- 3. documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  storage_path TEXT NOT NULL,
  page_count INTEGER DEFAULT 1,
  word_count INTEGER DEFAULT 0,
  ocr_used BOOLEAN DEFAULT FALSE,
  extracted_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_project ON public.documents(project_id);

-- 4. document_chunks
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  page_number INTEGER DEFAULT 1,
  section_label TEXT DEFAULT '',
  content TEXT NOT NULL,
  token_estimate INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON public.document_chunks(document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_chunks_user ON public.document_chunks(user_id);

-- 5. assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  assignment_type TEXT NOT NULL DEFAULT 'Essay',
  question TEXT NOT NULL DEFAULT '',
  lecturer_instructions TEXT DEFAULT '',
  target_word_count INTEGER DEFAULT 1500,
  academic_level TEXT DEFAULT 'Undergraduate',
  subject TEXT DEFAULT '',
  referencing_style TEXT DEFAULT 'APA 7',
  submission_requirements TEXT DEFAULT '',
  rubric_text TEXT DEFAULT '',
  attached_document_ids UUID[] DEFAULT '{}',
  analysis_json JSONB,
  rubric_review_json JSONB,
  final_review_json JSONB,
  draft_markdown TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'reviewed', 'completed')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON public.assignments(user_id, updated_at DESC);

-- 6. assignment_sections
CREATE TABLE IF NOT EXISTS public.assignment_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  heading TEXT NOT NULL,
  subheadings TEXT[] DEFAULT '{}',
  suggested_content TEXT DEFAULT '',
  target_words INTEGER DEFAULT 250,
  draft_content TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sections_assignment ON public.assignment_sections(assignment_id, order_index);

-- 7. conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  workspace TEXT NOT NULL CHECK (workspace IN ('notes', 'tutor', 'assignment')),
  subject TEXT DEFAULT '',
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id, updated_at DESC);

-- 8. messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  citations_json JSONB DEFAULT '[]'::jsonb,
  provider_used TEXT DEFAULT '',
  model_used TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_convo ON public.messages(conversation_id, created_at ASC);

-- 9. references
CREATE TABLE IF NOT EXISTS public.references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  style TEXT NOT NULL DEFAULT 'APA 7',
  source_type TEXT NOT NULL DEFAULT 'Journal Article',
  author TEXT NOT NULL DEFAULT '',
  publication_year TEXT DEFAULT '',
  title TEXT NOT NULL,
  publisher_or_journal TEXT DEFAULT '',
  doi TEXT DEFAULT '',
  url TEXT DEFAULT '',
  in_text_citation TEXT DEFAULT '',
  formatted_reference TEXT DEFAULT '',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  missing_fields TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_references_user ON public.references(user_id, created_at DESC);

-- 10. quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'Intermediate',
  question_types TEXT[] DEFAULT '{}',
  questions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_document_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quizzes_user ON public.quizzes(user_id, created_at DESC);

-- 11. quiz_results
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  answers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON public.quiz_results(user_id, completed_at DESC);

-- 12. planner_tasks
CREATE TABLE IF NOT EXISTS public.planner_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'assignment' CHECK (task_type IN ('assignment', 'exam', 'study', 'personal')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE NOT NULL,
  time_slot TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_planner_user ON public.planner_tasks(user_id, due_date ASC);

-- 13. usage_logs
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'fallback_success', 'error', 'rate_limited')),
  latency_ms INTEGER DEFAULT 0,
  error_message TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_usage_user_day ON public.usage_logs(user_id, created_at DESC);

-- 14. ai_provider_settings (Global admin-managed configuration)
CREATE TABLE IF NOT EXISTS public.ai_provider_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  default_provider TEXT NOT NULL DEFAULT 'gemini' CHECK (default_provider IN ('gemini', 'openrouter')),
  default_model TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
  fallback_provider TEXT NOT NULL DEFAULT 'openrouter',
  fallback_model TEXT NOT NULL DEFAULT 'meta-llama/llama-3.3-70b-instruct:free',
  daily_request_limit INTEGER NOT NULL DEFAULT 40,
  max_response_tokens INTEGER NOT NULL DEFAULT 4096,
  max_file_size_mb INTEGER NOT NULL DEFAULT 10,
  enabled_features JSONB NOT NULL DEFAULT '{"assignment_studio":true,"notes_intelligence":true,"humanizer":true,"quiz_maker":true,"presentation_maker":true,"subject_tutor":true}'::jsonb,
  feature_model_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security on all 14 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_settings ENABLE ROW LEVEL SECURITY;

-- Strict User Ownership Policies (Students can only access their own records)
CREATE POLICY "profiles_own" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "projects_own" ON public.projects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "documents_own" ON public.documents FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chunks_own" ON public.document_chunks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assignments_own" ON public.assignments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sections_own" ON public.assignment_sections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_own" ON public.conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "messages_own" ON public.messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "references_own" ON public.references FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quizzes_own" ON public.quizzes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quiz_results_own" ON public.quiz_results FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "planner_own" ON public.planner_tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usage_logs_read_own" ON public.usage_logs FOR SELECT USING (auth.uid() = user_id);

-- Only admins can modify global AI provider settings; authenticated users can read non-secret provider availability
CREATE POLICY "settings_read_auth" ON public.ai_provider_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_admin_write" ON public.ai_provider_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Private Storage Bucket for Study Documents
INSERT INTO storage.buckets (id, name, public) VALUES ('mg-documents', 'mg-documents', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_own_objects" ON storage.objects FOR ALL
  USING (bucket_id = 'mg-documents' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'mg-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
