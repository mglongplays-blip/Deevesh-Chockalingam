import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PenTool,
  Presentation,
  Quote,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { WorkspaceRoute } from '../types';
import { MGLogo } from './MGLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface NavItem {
  id: WorkspaceRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MAIN_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'assignment-studio', label: 'Assignment Studio', icon: FileText },
  { id: 'notes-intelligence', label: 'Notes Intelligence', icon: BookOpen },
  { id: 'humanizer', label: 'Humanizer', icon: PenTool },
  { id: 'reference-generator', label: 'Reference Generator', icon: Quote },
  { id: 'quiz-maker', label: 'Quiz Maker', icon: CheckSquare },
  { id: 'presentation-maker', label: 'Presentation Maker', icon: Presentation },
  { id: 'subject-tutor', label: 'Subject Tutor', icon: GraduationCap },
  { id: 'planner', label: 'Student Planner', icon: Calendar },
  { id: 'projects', label: 'My Projects', icon: FolderKanban },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface AppShellProps {
  activeRoute: WorkspaceRoute;
  onNavigate: (route: WorkspaceRoute) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ activeRoute, onNavigate, children }) => {
  const { user, usage, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: NavItem[] =
    user?.role === 'admin'
      ? [...MAIN_NAV, { id: 'admin', label: 'Admin Console', icon: ShieldCheck }]
      : MAIN_NAV;

  const activeLabel = navItems.find((n) => n.id === activeRoute)?.label || 'Workspace';

  const handleSelect = (id: WorkspaceRoute) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0F172A] transition-all duration-200 shrink-0 ${
          collapsed ? 'w-[74px]' : 'w-[256px]'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => handleSelect('dashboard')}
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg cursor-pointer"
          >
            <MGLogo compact={collapsed} />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1" aria-label="Primary Workspace Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
          {!collapsed && usage && (
            <div className="px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Daily AI Allowance</span>
                <span className="font-mono-tabular font-medium text-slate-900 dark:text-slate-200">
                  {usage.dailyUsed}/{usage.dailyLimit}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all"
                  style={{ width: `${Math.min(100, (usage.dailyUsed / Math.max(1, usage.dailyLimit)) * 100)}%` }}
                />
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-14 md:h-16 flex items-center justify-between gap-4 px-4 lg:px-8 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Open workspace menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display text-base md:text-lg font-semibold tracking-tight text-slate-900 dark:text-white truncate">
              {activeLabel}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => handleSelect('settings')}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="max-w-[140px] truncate">{user?.full_name}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Workspace Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Compact <= 15% viewport height) */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md grid grid-cols-5"
        aria-label="Mobile Bottom Navigation"
      >
        {[
          { id: 'dashboard' as WorkspaceRoute, label: 'Home', icon: LayoutDashboard },
          { id: 'assignment-studio' as WorkspaceRoute, label: 'Studio', icon: FileText },
          { id: 'notes-intelligence' as WorkspaceRoute, label: 'Notes', icon: BookOpen },
          { id: 'planner' as WorkspaceRoute, label: 'Planner', icon: Calendar },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeRoute === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                active
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
        >
          <Menu className="w-4 h-4" />
          <span>Tools</span>
        </button>
      </nav>

      {/* Mobile Full Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[84vw] bg-white dark:bg-[#0F172A] h-full flex flex-col border-r border-slate-200 dark:border-slate-800">
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
              <MGLogo />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeRoute === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
