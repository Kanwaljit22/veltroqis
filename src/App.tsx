import React, { useEffect, useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { ToastContainer } from './components/ui/Toast';
import { RoutePermissionGuard } from './components/ui/PermissionGuard';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { InvitationsPage } from './pages/InvitationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage';
import { TaskBoardPage } from './pages/TaskBoardPage';
import { TaskDetailsPage } from './pages/TaskDetailsPage';
import { ScrumboardPage } from './pages/ScrumboardPage';
import { DailyScrumPage } from './pages/DailyScrumPage';
import { IssueTrackerPage } from './pages/IssueTrackerPage';
import { SettingsPage } from './pages/SettingsPage';
import { LandingPage } from './pages/LandingPage';
import { useAuthStore } from './store/authStore';
import { useThemeStore, syncDocumentTheme } from './store/themeStore';

function ThemeSync() {
  const colorMode = useThemeStore((s) => s.colorMode);
  useLayoutEffect(() => {
    syncDocumentTheme(colorMode);
  }, [colorMode]);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // data stays fresh for 5 min
      gcTime: 10 * 60 * 1000,     // keep unused cache for 10 min
      retry: 1,
      refetchOnWindowFocus: false, // prevent spurious re-fetches when switching tabs / DevTools
      refetchOnReconnect: true,    // but do refresh after a network drop
    },
  },
});

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuthStore();
  // While checking session, don't redirect — avoids flash on page refresh
  if (loading) return <>{children}</>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

function AppContent() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
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

          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailsPage />} />
          <Route path="/tasks" element={<TaskBoardPage />} />
          <Route path="/tasks/:id" element={<TaskDetailsPage />} />
          <Route path="/scrumboard" element={<ScrumboardPage />} />
          <Route path="/standup" element={<DailyScrumPage />} />
          <Route path="/issues" element={<IssueTrackerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Landing page — redirects authenticated users to dashboard */}
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
      <ToastContainer />
    </>
  );
}

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
