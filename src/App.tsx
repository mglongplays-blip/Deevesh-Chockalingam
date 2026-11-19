import React, { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AdminPage } from './pages/AdminPage';
import { AssignmentStudioPage } from './pages/AssignmentStudioPage';
import { AuthPages } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { HumanizerPage } from './pages/HumanizerPage';
import { LandingPage } from './pages/LandingPage';
import { NotesIntelligencePage } from './pages/NotesIntelligencePage';
import { PlannerPage } from './pages/PlannerPage';
import { PresentationMakerPage } from './pages/PresentationMakerPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { QuizMakerPage } from './pages/QuizMakerPage';
import { ReferenceGeneratorPage } from './pages/ReferenceGeneratorPage';
import { SettingsPage } from './pages/SettingsPage';
import { SubjectTutorPage } from './pages/SubjectTutorPage';
import type { WorkspaceRoute } from './types';

function AppRouter() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState<WorkspaceRoute>('landing');
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      if (route === 'landing' || route === 'login' || route === 'register' || route === 'forgot-password') {
        setRoute(user.onboarding_completed ? 'dashboard' : 'onboarding');
      }
    } else if (!loading && !user) {
      const publicRoutes: WorkspaceRoute[] = ['landing', 'login', 'register', 'forgot-password'];
      if (!publicRoutes.includes(route)) {
        setRoute('landing');
      }
    }
  }, [loading, user, route]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B1120] text-slate-600 dark:text-slate-300 text-sm">
        Loading MG – Meet Genie...
      </div>
    );
  }

  if (!user) {
    if (route === 'login' || route === 'register' || route === 'forgot-password') {
      return (
        <>
          <AuthPages mode={route} onNavigate={setRoute} />
          <OfflineIndicator />
        </>
      );
    }
    return (
      <>
        <LandingPage onNavigate={setRoute} />
        <OfflineIndicator />
      </>
    );
  }

  if (route === 'onboarding') {
    return (
      <>
        <AuthPages mode="onboarding" onNavigate={setRoute} />
        <OfflineIndicator />
      </>
    );
  }

  const openAssignment = (assignmentId: string) => {
    setActiveAssignmentId(assignmentId);
    setRoute('assignment-studio');
  };

  return (
    <>
      <AppShell activeRoute={route} onNavigate={setRoute}>
        {route === 'dashboard' && <DashboardPage onNavigate={setRoute} onOpenAssignment={openAssignment} />}
        {route === 'assignment-studio' && <AssignmentStudioPage initialAssignmentId={activeAssignmentId} />}
        {route === 'notes-intelligence' && <NotesIntelligencePage />}
        {route === 'humanizer' && <HumanizerPage />}
        {route === 'reference-generator' && <ReferenceGeneratorPage />}
        {route === 'quiz-maker' && <QuizMakerPage />}
        {route === 'presentation-maker' && <PresentationMakerPage />}
        {route === 'subject-tutor' && <SubjectTutorPage />}
        {route === 'planner' && <PlannerPage />}
        {route === 'projects' && <ProjectsPage onOpenAssignment={openAssignment} onNavigate={setRoute} />}
        {route === 'settings' && <SettingsPage />}
        {route === 'admin' && <AdminPage />}
      </AppShell>
      <OfflineIndicator />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}
