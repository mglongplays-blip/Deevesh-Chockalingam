export type UserRole = 'student' | 'admin';

export interface ProfileRecord {
  id: string;
  email: string;
  password_hash?: string;
  full_name: string;
  university: string;
  course: string;
  academic_level: string;
  writing_style: string;
  referencing_style: string;
  country: string;
  study_interests: string[];
  role: UserRole;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  email: string;
  token_hash: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface ProjectRecord {
  id: string;
  user_id: string;
  title: string;
  folder: string;
  subject: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  user_id: string;
  project_id: string | null;
  file_name: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  page_count: number;
  word_count: number;
  ocr_used: boolean;
  extracted_text: string;
  created_at: string;
}

export interface DocumentChunkRecord {
  id: string;
  user_id: string;
  document_id: string;
  chunk_index: number;
  page_number: number;
  section_label: string;
  content: string;
  token_estimate: number;
  created_at: string;
}

export interface AssignmentAnalysis {
  main_question: string;
  requirements: string[];
  key_topics: string[];
  learning_outcomes: string[];
  marking_criteria: string[];
  required_sections: string[];
  word_count_guidance: string;
  referencing_requirements: string;
}

export interface RubricReviewItem {
  criterion: string;
  what_draft_addresses: string;
  missing_elements: string[];
  areas_for_improvement: string;
  suggested_revisions: string;
}

export interface RubricReviewResult {
  disclaimer: string;
  overall_alignment: string;
  criteria_reviews: RubricReviewItem[];
}

export interface FinalReviewResult {
  word_count_actual: number;
  word_count_target: number;
  word_count_status: string;
  grammar_issues: string[];
  spelling_issues: string[];
  clarity_suggestions: string[];
  citation_audit: string[];
  rubric_checklist: { item: string; met: boolean; note: string }[];
}

export interface AssignmentRecord {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  assignment_type: string;
  question: string;
  lecturer_instructions: string;
  target_word_count: number;
  academic_level: string;
  subject: string;
  referencing_style: string;
  submission_requirements: string;
  rubric_text: string;
  attached_document_ids: string[];
  analysis_json: AssignmentAnalysis | null;
  rubric_review_json: RubricReviewResult | null;
  final_review_json: FinalReviewResult | null;
  draft_markdown: string;
  status: 'draft' | 'in_progress' | 'reviewed' | 'completed';
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentSectionRecord {
  id: string;
  user_id: string;
  assignment_id: string;
  order_index: number;
  heading: string;
  subheadings: string[];
  suggested_content: string;
  target_words: number;
  draft_content: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationRecord {
  id: string;
  user_id: string;
  project_id: string | null;
  workspace: 'notes' | 'tutor' | 'assignment';
  subject: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageCitation {
  document_id: string;
  file_name: string;
  page_number: number;
  section_label: string;
  excerpt: string;
}

export interface MessageRecord {
  id: string;
  user_id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations_json: MessageCitation[];
  provider_used: string;
  model_used: string;
  created_at: string;
}

export interface ReferenceRecord {
  id: string;
  user_id: string;
  project_id: string | null;
  style: 'APA 7' | 'Harvard' | 'MLA' | 'IEEE';
  source_type: string;
  author: string;
  publication_year: string;
  title: string;
  publisher_or_journal: string;
  doi: string;
  url: string;
  in_text_citation: string;
  formatted_reference: string;
  verified: boolean;
  missing_fields: string[];
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank';
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
  source_hint?: string;
}

export interface QuizRecord {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  difficulty: string;
  question_types: string[];
  questions_json: QuizQuestion[];
  source_document_ids: string[];
  created_at: string;
}

export interface QuizResultRecord {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  answers_json: {
    question_id: string;
    user_answer: string;
    is_correct: boolean;
  }[];
  completed_at: string;
}

export interface PlannerTaskRecord {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  task_type: 'assignment' | 'exam' | 'study' | 'personal';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  time_slot: string;
  notes: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsageLogRecord {
  id: string;
  user_id: string;
  feature: string;
  provider: string;
  model: string;
  status: 'success' | 'fallback_success' | 'error' | 'rate_limited';
  latency_ms: number;
  error_message: string;
  created_at: string;
}

export interface AIProviderSettingsRecord {
  id: string;
  default_provider: 'gemini' | 'openrouter';
  default_model: string;
  fallback_provider: 'gemini' | 'openrouter' | 'none';
  fallback_model: string;
  daily_request_limit: number;
  max_response_tokens: number;
  max_file_size_mb: number;
  enabled_features: {
    assignment_studio: boolean;
    notes_intelligence: boolean;
    humanizer: boolean;
    quiz_maker: boolean;
    presentation_maker: boolean;
    subject_tutor: boolean;
  };
  feature_model_overrides: Record<string, string>;
  updated_at: string;
}
