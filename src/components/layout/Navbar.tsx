import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Search, LogOut, User, Settings, ChevronDown, CheckCheck, Zap,
} from 'lucide-react';
import { cn, formatTimeAgo } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useNotifications } from '../../hooks/useDashboard';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../lib/queryKeys';

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { sidebarOpen, globalSearch, setGlobalSearch } = useAppStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Live notifications from Supabase
  const { data: notifications = [] } = useNotifications(user?.id ?? '');

  const unreadCount = notifications.filter((n: { read: boolean }) => !n.read).length;

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!isSupabaseConfigured() || !user?.id) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: QUERY_KEYS.notifications(user.id) });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: QUERY_KEYS.notifications(user.id) });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAsRead = async (notifId: string) => {
    if (!isSupabaseConfigured()) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('notifications').update({ read: true }).eq('id', notifId);
    qc.invalidateQueries({ queryKey: QUERY_KEYS.notifications(user?.id ?? '') });
  };

  type NotifRow = {
    id: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    entity_type?: string | null;
    entity_id?: string | null;
    actor?: { full_name: string; avatar_url: string | null } | null;
  };

  const openNotification = async (n: NotifRow) => {
    await markAsRead(n.id);
    const et = n.entity_type;
    const eid = n.entity_id;
    if (et === 'task' && eid) navigate(`/tasks/${eid}`);
    else if (et === 'project' && eid) navigate(`/projects/${eid}`);
    else if (et === 'issue' && eid) navigate('/issues');
    else if (et === 'sprint') navigate('/scrumboard');
    setNotifOpen(false);
  };

  const markAllRead = async () => {
    if (!isSupabaseConfigured() || !user?.id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    qc.invalidateQueries({ queryKey: QUERY_KEYS.notifications(user.id) });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-30 transition-all duration-300',
        sidebarOpen ? 'left-60' : 'left-16'
      )}
    >
      <div className="flex items-center gap-2 lg:hidden">
        <Zap className="h-5 w-5 text-cyan-500" />
        <span className="font-bold text-sm">VELTROQIS</span>
      </div>

      {/* Search */}
      <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks, projects, users..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl z-50 animate-fade-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-sm text-slate-900">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">No notifications</div>
                ) : (
                  (notifications as NotifRow[]).map((n) => (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => void openNotification(n)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          void openNotification(n);
                        }
                      }}
                      className={cn(
                        'flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 text-left w-full',
                        !n.read && 'bg-blue-50/50'
                      )}
                    >
                      <Avatar src={n.actor?.avatar_url ?? undefined} name={n.actor?.full_name || 'Admin'} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 leading-snug">{n.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatTimeAgo(n.created_at)}</p>
                      </div>
                      {!n.read && (
                        <div className="shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-1.5" aria-hidden />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <Avatar src={user?.avatar_url} name={user?.full_name || 'User'} size="sm" />
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-xl z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.full_name || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { navigate('/profile'); setProfileOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="h-4 w-4" />Profile
                </button>
                <button
                  onClick={() => { navigate('/settings'); setProfileOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="h-4 w-4" />Settings
                </button>
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />Sign out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
