import React, { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { ToastContainer } from './components/ui/Toast';
import { RoutePermissionGuard } from './components/ui/PermissionGuard';
import { useAuthStore } from './store/authStore';
import { useThemeStore, syncDocumentTheme } from './store/themeStore';

// ─── Route-level code splitting ───────────────────────────────────────────────
// Each lazy() call becomes a separate JS chunk so the browser only downloads
// the code for the page the user actually navigates to.
// All pages use named exports, so we re-export as `default` via .then().

const LoginPage          = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const SignupPage         = lazy(() => import('./pages/auth/SignupPage').then((m) => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const LandingPage        = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const DashboardPage      = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage').then((m) => ({ default: m.UserManagementPage })));
const InvitationsPage    = lazy(() => import('./pages/InvitationsPage').then((m) => ({ default: m.InvitationsPage })));
const ProfilePage        = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const ProjectsPage       = lazy(() => import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailsPage = lazy(() => import('./pages/ProjectDetailsPage').then((m) => ({ default: m.ProjectDetailsPage })));
const TaskDetailsPage    = lazy(() => import('./pages/TaskDetailsPage').then((m) => ({ default: m.TaskDetailsPage })));
const ScrumboardPage     = lazy(() => import('./pages/ScrumboardPage').then((m) => ({ default: m.ScrumboardPage })));
const DailyScrumPage     = lazy(() => import('./pages/DailyScrumPage').then((m) => ({ default: m.DailyScrumPage })));
const IssueTrackerPage   = lazy(() => import('./pages/IssueTrackerPage').then((m) => ({ default: m.IssueTrackerPage })));
const SettingsPage       = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

// ─── Page-transition loading indicator ────────────────────────────────────────
// Shown by Suspense while a lazy chunk is being fetched.
// Uses CSS custom properties so it respects both light and dark themes.

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-page">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-base"
        style={{ borderTopColor: 'var(--color-accent)' }}
      />
    </div>
  );
}

// ─── Theme sync ───────────────────────────────────────────────────────────────

function ThemeSync() {
  const colorMode = useThemeStore((s) => s.colorMode);
  useLayoutEffect(() => {
    syncDocumentTheme(colorMode);
  }, [colorMode]);
  return null;
}

// ─── Query client ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

// ─── Auth guard ───────────────────────────────────────────────────────────────

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuthStore();
  if (loading) return <>{children}</>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// ─── App routes ───────────────────────────────────────────────────────────────

function AppContent() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <AuthGuard>
                <LoginPage />
              </AuthGuard>
            }
          />
          <Route
            path="/signup"
            element={
              <AuthGuard>
                <SignupPage />
              </AuthGuard>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <AuthGuard>
                <ForgotPasswordPage />
              </AuthGuard>
            }
          />

          {/* Protected routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Admin-only routes */}
            <Route
              path="/users"
              element={
                <RoutePermissionGuard permission="manage_users">
                  <UserManagementPage />
                </RoutePermissionGuard>
              }
            />
            <Route
              path="/invitations"
              element={
                <RoutePermissionGuard permission="send_invitations">
                  <InvitationsPage />
                </RoutePermissionGuard>
              }
            />

            <Route path="/profile"         element={<ProfilePage />} />
            <Route path="/projects"        element={<ProjectsPage />} />
            <Route path="/projects/:id"    element={<ProjectDetailsPage />} />
            <Route path="/tasks/:id"       element={<TaskDetailsPage />} />
            <Route path="/scrumboard"      element={<ScrumboardPage />} />
            <Route path="/standup"         element={<DailyScrumPage />} />
            <Route path="/issues"          element={<IssueTrackerPage />} />
            <Route path="/settings"        element={<SettingsPage />} />
          </Route>

          {/* Landing page */}
          <Route
            path="/"
            element={
              <AuthGuard>
                <LandingPage />
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      <ToastContainer />
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeSync />
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
