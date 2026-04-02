import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Outlet, Navigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';

export const AppLayout: React.FC = () => {
  const { isAuthenticated, loading } = useAuthStore();
  const { sidebarOpen } = useAppStore();

  // Show spinner only on first load when we're checking the session
  // AND user isn't already known to be authenticated (from persisted state)
  if (loading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-cyan-400 to-blue-500 animate-pulse" />
          <p className="text-sm text-slate-500">Loading Veltroqis...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Tooltip.Provider delayDuration={300} skipDelayDuration={200}>
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <Navbar />
        <main
          className={cn(
            'pt-16 min-h-screen transition-all duration-300',
            sidebarOpen ? 'pl-60' : 'pl-16'
          )}
        >
          <div className="px-5 py-4">
            <Outlet />
          </div>
        </main>
      </div>
    </Tooltip.Provider>
  );
};
