import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckSquare,
  ChevronDown,
  FileText,
  GraduationCap,
  Lock,
  Moon,
  PenTool,
  Presentation,
  Quote,
  Shield,
  Sun,
} from 'lucide-react';
import { MGLogo } from '../components/MGLogo';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { useTheme } from '../context/ThemeContext';
import type { WorkspaceRoute } from '../types';

interface LandingPageProps {
  onNavigate: (route: WorkspaceRoute) => void;
}

const FAQS = [
  {
    q: 'Is MG – Meet Genie free for university and college students?',
    a: 'Yes. MG is free to access for students worldwide, built around free-tier AI models with transparent daily fair-use limits (default 40 AI requests/day) and third-party service availability rather than unlimited promises or hidden paywalls.',
  },
  {
    q: 'Does MG guarantee assignment grades or bypass AI detectors?',
    a: 'No. MG helps you structure arguments, verify rubric coverage, improve academic clarity, and organize references accurately. It never promises specific grades, never fabricates citations, and never claims to bypass AI detection tools.',
  },
  {
    q: 'How are my uploaded lecture notes and assignments protected?',
    a: 'Your documents and projects are isolated to your account with server-side authentication and Row Level Security rules. AI prompts are routed through a central server-side gateway so API keys are never exposed in the browser. Please note that submitted text is processed by configured third-party AI providers (Google Gemini or OpenRouter) according to their terms.',
  },
  {
    q: 'What file formats can I upload and export?',
    a: 'You can upload PDF, DOCX, PPTX, TXT, and Markdown files (with optional OCR for scanned PDFs). Assignment Studio exports to formatted DOCX, PDF, and TXT, while Presentation Maker exports directly to PPTX.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { theme, toggleTheme } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [bentoImgFailed, setBentoImgFailed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          <a href="#top" className="focus-visible:outline-none">
            <MGLogo />
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#workflow" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0">
              How It Works
            </a>
            <a href="#disciplines" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0">
              Disciplines
            </a>
            <a href="#faq" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-20 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-3">
              Free student access · Multi-AI Gateway · Subject to fair-use limits
            </p>
            <h1
              className="font-display font-bold tracking-tight text-slate-900 dark:text-white leading-[1.08]"
              style={{ fontSize: 'clamp(2.25rem, 4vw, 3.75rem)', textWrap: 'balance' }}
            >
              Meet Your New Academic Genie.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              Your assignments, study materials and academic journey — powered by intelligent AI.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-sm transition-colors whitespace-nowrap"
              >
                Explore Features
              </a>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer whitespace-nowrap"
              >
                Sign In
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>DOCX, PDF &amp; PPTX exports</span>
              <span aria-hidden="true">·</span>
              <span>APA 7, Harvard, MLA &amp; IEEE</span>
              <span aria-hidden="true">·</span>
              <span>Installable Mobile PWA</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer ml-auto"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 flex">
            <div className="relative w-full min-h-[280px] lg:min-h-[420px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81]">
              {!heroImgFailed ? (
                <img
                  src="/src/assets/images/hero_academic_genie_1795056817876.jpg"
                  alt="Modern university research workspace illuminated in deep navy and violet light"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-200">
                  <GraduationCap className="w-12 h-12 text-indigo-300 mb-3" />
                  <p className="font-display text-lg font-semibold">MG – Meet Genie Academic Workspace</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent pointer-events-none" />
              <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center justify-between gap-3 text-white">
                <div>
                  <p className="font-display text-sm font-semibold">9-Step Assignment Studio</p>
                  <p className="text-xs text-slate-200">Instructions · Notes Retrieval · Rubric Review · Real Export</p>
                </div>
                <PWAInstallButton />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Overview (Asymmetric Bento) */}
      <section id="features" className="border-t border-slate-200 dark:border-slate-800/80 py-16 lg:py-24 bg-white dark:bg-[#0F172A]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Nine integrated workspaces built around real university workflows
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Every module connects directly to your uploaded lecture notes, project folders, and saved bibliographies.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Marquee Card */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 overflow-hidden grid grid-cols-1 md:grid-cols-2">
              <div className="p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">
                    <FileText className="w-4 h-4" />
                    <span>Flagship Workspace</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    Genie Assignment Studio
                  </h3>
                  <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Upload your brief, rubric, and slides. Generate structured outlines, draft section by section with source grounding, audit against your marking criteria, refine in the rich editor, and export to DOCX, PDF, or TXT.
                  </p>
                </div>
                <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">
                  Essays · Reports · Case Studies · Literature Reviews · Proposals
                </div>
              </div>
              <div className="min-h-[220px] bg-slate-900">
                {!bentoImgFailed ? (
                  <img
                    src="/src/assets/images/bento_assignment_studio_1795056817264.jpg"
                    alt="Organized academic research sheets and architectural study cards"
                    referrerPolicy="no-referrer"
                    onError={() => setBentoImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-6 text-slate-300">
                    <FileText className="w-10 h-10 text-indigo-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Notes Intelligence */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Document Retrieval</span>
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  Notes Intelligence
                </h3>
                <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Extract chapter summaries, definitions, and revision sheets from PDF, DOCX, and PPTX files. Ask Genie questions with page and file citations.
                </p>
              </div>
              <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">
                Chunked retrieval · Scanned PDF OCR · Keyword search
              </div>
            </div>

            {/* Secondary Grid */}
            {[
              {
                icon: PenTool,
                title: 'Genie Humanizer',
                desc: 'Refine flow, grammar, and transitions across six academic English styles while preserving citations and technical terminology.',
                meta: 'Side-by-side diff · Word count · Integrity-first',
              },
              {
                icon: Quote,
                title: 'Reference Generator',
                desc: 'Format in-text citations and bibliographies in APA 7, Harvard, MLA, and IEEE without inventing authors or DOIs.',
                meta: 'Missing field checks · Verification labels',
              },
              {
                icon: CheckSquare,
                title: 'Quiz Maker & Flashcards',
                desc: 'Turn lecture notes into multiple-choice, true/false, short-answer, and fill-in-the-blank quizzes, flashcards, and mock exams.',
                meta: 'Instant marking · Explanations · Retakes',
              },
              {
                icon: Presentation,
                title: 'Presentation Maker',
                desc: 'Generate structured slide outlines, slide bullet points, and speaker notes from your assignment or notes, then export to PPTX.',
                meta: '16:9 PowerPoint export · Speaker notes',
              },
              {
                icon: GraduationCap,
                title: 'Subject Tutor',
                desc: 'Step-by-step explanations, worked calculations, and annotated code walkthroughs across IT, Business, STEM, Law, and Humanities.',
                meta: 'Worked steps · Practice problems',
              },
              {
                icon: Calendar,
                title: 'Student Planner & Projects',
                desc: 'Track assignment deadlines, exam dates, study timetables, and organized project folders from one dashboard.',
                meta: 'Calendar & list views · Priority tracking',
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-6 flex flex-col justify-between"
                >
                  <div>
                    <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-3" />
                    <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                  <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">{card.meta}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How MG Works */}
      <section id="workflow" className="py-16 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            How MG works from brief to submission
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              num: '01. Upload & Structure',
              body: 'Create a project, enter your lecturer instructions, and upload PDF, DOCX, PPTX, or TXT study materials. MG indexes documents into searchable page-tagged sections.',
            },
            {
              num: '02. Draft & Verify',
              body: 'Generate an editable outline and draft section by section. Run a marking rubric review and citation audit to spot missing requirements before you submit.',
            },
            {
              num: '03. Revise & Export',
              body: 'Polish prose in the rich editor or Humanizer, generate APA 7/Harvard/MLA/IEEE references, build revision quizzes or slides, and download real DOCX, PDF, or PPTX files.',
            },
          ].map((step) => (
            <div key={step.num} className="pt-4 border-t border-slate-300 dark:border-slate-700">
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">{step.num}</h3>
              <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disciplines & Multi-AI Architecture */}
      <section id="disciplines" className="border-t border-slate-200 dark:border-slate-800/80 py-16 lg:py-24 bg-white dark:bg-[#0F172A]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Built for university disciplines worldwide
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Tailored tutoring, structured calculations, and academic terminology across undergraduate and postgraduate programmes.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Information Technology</h3>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Programming, Computer Science, Networking, Cybersecurity, Databases, Software Engineering
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Business &amp; Economics</h3>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Business Administration, Marketing, Management, Accounting, Finance, HR, Entrepreneurship
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Social Sciences</h3>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Psychology, Sociology, Political Science, Communication Studies
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">STEM, Law &amp; Humanities</h3>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Engineering, Mathematics, Statistics, Education, Law, Humanities, Health Sciences
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Multi-AI Gateway &amp; Free Fair-Use Policy</span>
              </div>
              <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                MG routes requests through a central server-side gateway supporting Google Gemini and OpenRouter free-tier models with automatic provider fallback. Free access is governed by transparent daily allowances and upstream provider availability — never auto-billed paid tiers.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Privacy &amp; External AI Processing Notice</span>
              </div>
              <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Student projects and uploaded files are isolated per account with Row Level Security. When you invoke AI features, relevant excerpts are transmitted server-side to your configured AI provider (Google Gemini or OpenRouter) and processed under that provider&apos;s applicable terms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 lg:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-8">
          Frequently asked questions
        </h2>
        <div className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
          {FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={item.q} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 text-left font-medium text-slate-900 dark:text-white py-1 cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Ready to organize your semester?
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Create your free student account in under a minute.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Create Free Account
          </button>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <MGLogo />
            <span>·</span>
            <span>Your Academic Journey, Powered by AI</span>
          </div>
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => onNavigate('login')} className="hover:text-slate-900 dark:hover:text-white cursor-pointer">
              Sign In
            </button>
            <button type="button" onClick={() => onNavigate('register')} className="hover:text-slate-900 dark:hover:text-white cursor-pointer">
              Register
            </button>
            <span>Free student tier · Subject to fair-use limits</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
