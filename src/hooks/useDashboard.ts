import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured, isSchemaError } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import {
  MOCK_DASHBOARD_STATS,
  MOCK_ACTIVITY_LOGS,
  MOCK_ROLE_DISTRIBUTION,
  MOCK_TASK_CHART_DATA,
  MOCK_BUG_TREND_DATA,
} from '../lib/mockData';
import { QUERY_KEYS } from '../lib/queryKeys';
import type {
  DashboardStats,
  RoleDistribution,
  ActivityLog,
  UserRole,
} from '../types';
import { format, subMonths, startOfMonth, endOfMonth, subWeeks, startOfWeek, endOfWeek } from 'date-fns';

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery({
    queryKey: QUERY_KEYS.dashboardStats,
    queryFn: async (): Promise<DashboardStats> => {
      if (!isSupabaseConfigured()) return MOCK_DASHBOARD_STATS;

      const results = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('invitations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'done'),
        supabase.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ]);

      // If any table is missing (schema not applied yet) return zeros
      if (results.some((r) => isSchemaError(r.error))) return MOCK_DASHBOARD_STATS;

      const [
        { count: totalUsers }, { count: activeUsers }, { count: adminUsers },
        { count: pendingInvites }, { count: totalProjects }, { count: activeProjects },
        { count: totalTasks }, { count: completedTasks }, { count: openIssues },
      ] = results;

      return {
        total_users: totalUsers ?? 0,
        active_users: activeUsers ?? 0,
        admin_users: adminUsers ?? 0,
        pending_invites: pendingInvites ?? 0,
        total_projects: totalProjects ?? 0,
        active_projects: activeProjects ?? 0,
        total_tasks: totalTasks ?? 0,
        completed_tasks: completedTasks ?? 0,
        open_issues: openIssues ?? 0,
      };
    },
    staleTime: 60_000,
  });
}

// ─── Role Distribution ────────────────────────────────────────────────────────

export function useRoleDistribution() {
  return useQuery({
    queryKey: QUERY_KEYS.roleDistribution,
    queryFn: async (): Promise<RoleDistribution[]> => {
      if (!isSupabaseConfigured()) return MOCK_ROLE_DISTRIBUTION;

      const { data, error } = await supabase
        .from('users')
        .select('role');
      if (error) {
        if (isSchemaError(error)) return MOCK_ROLE_DISTRIBUTION;
        throw new Error(error.message);
      }

      const counts: Record<string, number> = {};
      (data ?? []).forEach(({ role }) => {
        counts[role] = (counts[role] ?? 0) + 1;
      });

      const roles: UserRole[] = ['admin', 'project_lead', 'designer', 'developer', 'qa'];
      return roles.map((role) => ({ role, count: counts[role] ?? 0 }));
    },
    staleTime: 60_000,
  });
}

// ─── Activity Logs ────────────────────────────────────────────────────────────

/** Admin-only global audit feed (RLS + enabled gate). */
export function useActivityLogs(limit = 10) {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');

  return useQuery({
    queryKey: [...QUERY_KEYS.activityLogs, limit],
    queryFn: async (): Promise<ActivityLog[]> => {
      if (!isSupabaseConfigured()) {
        return MOCK_ACTIVITY_LOGS.slice(0, limit);
      }

      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, user:users(id, full_name, avatar_url, email, role, status, joined_at, created_at, updated_at)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) {
        if (isSchemaError(error)) return [];
        throw new Error(error.message);
      }
      return (data ?? []) as unknown as ActivityLog[];
    },
    enabled: isAdmin,
    staleTime: 15_000,
    refetchInterval: isAdmin ? 45_000 : false,
  });
}

// ─── Task Chart Data (last 6 months) ─────────────────────────────────────────

export function useTaskChartData() {
  return useQuery({
    queryKey: QUERY_KEYS.taskChartData,
    queryFn: async () => {
      if (!isSupabaseConfigured()) return MOCK_TASK_CHART_DATA;

      const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));

      const results = await Promise.all(
        months.map(async (month) => {
          const start = startOfMonth(month).toISOString();
          const end = endOfMonth(month).toISOString();

          const [{ count: created }, { count: completed }] = await Promise.all([
            supabase
              .from('tasks')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', start)
              .lte('created_at', end),
            supabase
              .from('tasks')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'done')
              .gte('updated_at', start)
              .lte('updated_at', end),
          ]);

          return {
            month: format(month, 'MMM'),
            created: created ?? 0,
            completed: completed ?? 0,
          };
        })
      );

      return results;
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Bug Trend Data (last 6 weeks) ───────────────────────────────────────────

export function useBugTrendData() {
  return useQuery({
    queryKey: QUERY_KEYS.bugTrendData,
    queryFn: async () => {
      if (!isSupabaseConfigured()) return MOCK_BUG_TREND_DATA;

      const weeks = Array.from({ length: 6 }, (_, i) => subWeeks(new Date(), 5 - i));

      const results = await Promise.all(
        weeks.map(async (week, idx) => {
          const start = startOfWeek(week).toISOString();
          const end = endOfWeek(week).toISOString();

          const [{ count: open }, { count: closed }] = await Promise.all([
            supabase
              .from('issues')
              .select('*', { count: 'exact', head: true })
              .in('status', ['open', 'in_progress'])
              .gte('created_at', start)
              .lte('created_at', end),
            supabase
              .from('issues')
              .select('*', { count: 'exact', head: true })
              .in('status', ['resolved', 'closed'])
              .gte('updated_at', start)
              .lte('updated_at', end),
          ]);

          return {
            week: `W${idx + 1}`,
            open: open ?? 0,
            closed: closed ?? 0,
          };
        })
      );

      return results;
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useNotifications(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.notifications(userId),
    queryFn: async () => {
      if (!isSupabaseConfigured() || !userId) return [];
      const res = await supabase
        .from('notifications')
        .select(`
          *,
          actor:users!notifications_actor_id_fkey(full_name, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (res.error) {
        const plain = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);
        if (plain.error) throw new Error(plain.error.message);
        return plain.data ?? [];
      }
      return res.data ?? [];
    },
    enabled: !!userId,
    staleTime: 15_000,
  });
}
