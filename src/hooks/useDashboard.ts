import { useQuery } from '@tanstack/react-query';
import { supabase, isSchemaError } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { QUERY_KEYS } from '../lib/queryKeys';
import type {
  DashboardStats,
  RoleDistribution,
  ActivityLog,
  UserRole,
} from '../types';
import {
  format,
  subMonths, startOfMonth, endOfMonth,
  subWeeks, startOfWeek, endOfWeek,
} from 'date-fns';

// ─── Shared Base Types ────────────────────────────────────────────────────────

interface RawUser    { role: string; status: string; created_at: string }
interface RawInvite  { status: string; sent_at: string }
interface RawProject { status: string }
interface RawTask    { status: string; created_at: string; updated_at: string }
interface RawIssue   { status: string; severity: string; created_at: string; updated_at: string }

interface DashboardRawData {
  readonly users:    RawUser[];
  readonly invites:  RawInvite[];
  readonly projects: RawProject[];
  readonly tasks:    RawTask[];
  readonly issues:   RawIssue[];
}

// ─── Shared query function ────────────────────────────────────────────────────
// Executes 5 parallel SELECT queries — one per table — and returns the raw rows.
// All dashboard stat/chart hooks subscribe to the same query key and receive
// their derived data via React Query's `select` option, so this function runs
// exactly once per cache window regardless of how many hooks are mounted.

async function fetchDashboardBase(): Promise<DashboardRawData> {
  const [usersRes, invitesRes, projectsRes, tasksRes, issuesRes] = await Promise.all([
    supabase.from('users').select('role, status, created_at'),
    supabase.from('invitations').select('status, sent_at'),
    supabase.from('projects').select('status'),
    supabase.from('tasks').select('status, created_at, updated_at'),
    supabase.from('issues').select('status, severity, created_at, updated_at'),
  ]);

  // Surface the first real error; schema errors return empty arrays gracefully.
  for (const res of [usersRes, invitesRes, projectsRes, tasksRes, issuesRes]) {
    if (res.error && !isSchemaError(res.error)) throw new Error(res.error.message);
  }

  return {
    users:    usersRes.data    ?? [],
    invites:  invitesRes.data  ?? [],
    projects: projectsRes.data ?? [],
    tasks:    tasksRes.data    ?? [],
    issues:   issuesRes.data   ?? [],
  };
}

// Shared query options — every stat/chart hook spreads these so they all target
// the same cache entry and benefit from React Query's built-in deduplication.
const DASHBOARD_BASE_OPTS = {
  queryKey: QUERY_KEYS.dashboardBase,
  queryFn:  fetchDashboardBase,
  staleTime: 60_000,
  gcTime:    5 * 60_000,
} as const;

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery({
    ...DASHBOARD_BASE_OPTS,
    select: (raw): DashboardStats => {
      const now            = new Date();
      const prevMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
      const prevMonthEnd   = endOfMonth(subMonths(now, 1)).toISOString();
      const curMonthStart  = startOfMonth(now).toISOString();
      const { users, invites, projects, tasks, issues } = raw;

      const monthCompletions = tasks.filter(
        (t) => t.status === 'done' && t.updated_at >= curMonthStart
      ).length;

      const prevMonthCompletions = tasks.filter(
        (t) => t.status === 'done' &&
               t.updated_at >= prevMonthStart &&
               t.updated_at <= prevMonthEnd
      ).length;

      return {
        total_users:     users.length,
        active_users:    users.filter((u) => u.status === 'active').length,
        admin_users:     users.filter((u) => u.role === 'admin').length,
        pending_invites: invites.filter((i) => i.status === 'pending').length,
        total_projects:  projects.length,
        active_projects: projects.filter((p) => p.status === 'active').length,
        total_tasks:     tasks.length,
        completed_tasks: tasks.filter((t) => t.status === 'done').length,
        open_issues:     issues.filter((i) => i.status === 'open').length,
        critical_issues: issues.filter(
          (i) => ['open', 'in_progress'].includes(i.status) &&
                 ['critical', 'blocker'].includes(i.severity)
        ).length,
        month_completions:      monthCompletions,
        prev_month_completions: prevMonthCompletions,
        prev_total_users:     users.filter((u) => u.created_at <= prevMonthEnd).length,
        prev_active_users:    users.filter((u) => u.status === 'active' && u.created_at <= prevMonthEnd).length,
        prev_admin_users:     users.filter((u) => u.role === 'admin' && u.created_at <= prevMonthEnd).length,
        prev_pending_invites: invites.filter((i) =>
          i.status === 'pending' &&
          i.sent_at >= prevMonthStart &&
          i.sent_at <= prevMonthEnd
        ).length,
      };
    },
  });
}

// ─── Role Distribution ────────────────────────────────────────────────────────

export function useRoleDistribution() {
  return useQuery({
    ...DASHBOARD_BASE_OPTS,
    select: (raw): RoleDistribution[] => {
      const counts: Record<string, number> = {};
      raw.users.forEach(({ role }) => {
        counts[role] = (counts[role] ?? 0) + 1;
      });

      const roles: UserRole[] = ['admin', 'project_lead', 'designer', 'developer', 'qa'];
      return roles.map((role) => ({ role, count: counts[role] ?? 0 }));
    },
  });
}

// ─── Task Chart Data (last 6 months) ─────────────────────────────────────────

export function useTaskChartData() {
  return useQuery({
    ...DASHBOARD_BASE_OPTS,
    select: (raw) => {
      const now         = new Date();
      const windowStart = startOfMonth(subMonths(now, 5));
      const windowEnd   = endOfMonth(now);

      const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
      const createdMap:   Record<string, number> = {};
      const completedMap: Record<string, number> = {};
      months.forEach((m) => {
        const key = format(m, 'MMM');
        createdMap[key]   = 0;
        completedMap[key] = 0;
      });

      raw.tasks.forEach((t) => {
        const created = new Date(t.created_at);
        if (created >= windowStart && created <= windowEnd) {
          const key = format(created, 'MMM');
          if (key in createdMap) createdMap[key]++;
        }
        if (t.status === 'done') {
          const updated = new Date(t.updated_at);
          if (updated >= windowStart && updated <= windowEnd) {
            const key = format(updated, 'MMM');
            if (key in completedMap) completedMap[key]++;
          }
        }
      });

      return months.map((m) => {
        const key = format(m, 'MMM');
        return { month: key, created: createdMap[key], completed: completedMap[key] };
      });
    },
  });
}

// ─── Bug Trend Data (last 6 weeks) ───────────────────────────────────────────

export function useBugTrendData() {
  return useQuery({
    ...DASHBOARD_BASE_OPTS,
    select: (raw) => {
      const now         = new Date();
      const windowStart = startOfWeek(subWeeks(now, 5));
      const windowEnd   = endOfWeek(now);

      const weeks = Array.from({ length: 6 }, (_, i) => subWeeks(now, 5 - i));
      const openMap:   Record<number, number> = {};
      const closedMap: Record<number, number> = {};
      weeks.forEach((_, idx) => { openMap[idx] = 0; closedMap[idx] = 0; });

      raw.issues.forEach((issue) => {
        const isOpen   = ['open', 'in_progress'].includes(issue.status);
        const isClosed = ['resolved', 'closed'].includes(issue.status);

        if (isOpen) {
          const d = new Date(issue.created_at);
          if (d >= windowStart && d <= windowEnd) {
            const idx = weeks.findIndex((w) => d >= startOfWeek(w) && d <= endOfWeek(w));
            if (idx !== -1) openMap[idx]++;
          }
        }
        if (isClosed) {
          const d = new Date(issue.updated_at);
          if (d >= windowStart && d <= windowEnd) {
            const idx = weeks.findIndex((w) => d >= startOfWeek(w) && d <= endOfWeek(w));
            if (idx !== -1) closedMap[idx]++;
          }
        }
      });

      return weeks.map((_, i) => ({
        week:   `W${i + 1}`,
        open:   openMap[i],
        closed: closedMap[i],
      }));
    },
  });
}

// ─── Project Status Breakdown ─────────────────────────────────────────────────

export function useProjectStatusBreakdown() {
  return useQuery({
    ...DASHBOARD_BASE_OPTS,
    select: (raw) => {
      const statuses = ['active', 'on_hold', 'completed', 'archived'] as const;
      const counts: Record<string, number> = {};
      raw.projects.forEach(({ status }) => {
        counts[status] = (counts[status] ?? 0) + 1;
      });
      return statuses
        .map((s) => ({ status: s, count: counts[s] ?? 0 }))
        .filter((s) => s.count > 0);
    },
  });
}

// ─── Issue Severity Trend (last 6 weeks) ──────────────────────────────────────

export function useIssueSeverityTrend() {
  return useQuery({
    ...DASHBOARD_BASE_OPTS,
    select: (raw) => {
      const now         = new Date();
      const weeks       = Array.from({ length: 6 }, (_, i) => subWeeks(now, 5 - i));
      type SevKey = 'minor' | 'major' | 'critical' | 'blocker';

      const buckets: Record<number, Record<SevKey, number>> = {};
      weeks.forEach((_, idx) => {
        buckets[idx] = { minor: 0, major: 0, critical: 0, blocker: 0 };
      });

      raw.issues.forEach((issue) => {
        const isActive = ['open', 'in_progress'].includes(issue.status);
        if (!isActive) return;
        const d = new Date(issue.created_at);
        const idx = weeks.findIndex((w) => d >= startOfWeek(w) && d <= endOfWeek(w));
        if (idx !== -1) {
          const sev = issue.severity as SevKey;
          if (sev in buckets[idx]) buckets[idx][sev]++;
        }
      });

      return weeks.map((_, i) => ({
        week: `W${i + 1}`,
        ...buckets[i],
      }));
    },
  });
}

// ─── Activity Logs ────────────────────────────────────────────────────────────

export function useActivityLogs(limit = 10) {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');

  return useQuery({
    queryKey: [...QUERY_KEYS.activityLogs, limit],
    queryFn: async (): Promise<ActivityLog[]> => {
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
    staleTime: 2 * 60_000,
    refetchInterval: isAdmin ? 2 * 60_000 : false,
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useNotifications(userId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.notifications(userId),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*, actor:users!notifications_actor_id_fkey(full_name, avatar_url)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        if (isSchemaError(error)) return [];
        throw new Error(error.message);
      }
      return data ?? [];
    },
    enabled: !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
