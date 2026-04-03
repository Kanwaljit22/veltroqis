import React from 'react';
import {
  CheckCircle2, FolderKanban, AlertOctagon, AlertTriangle,
  CalendarDays, Clock,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { StatCard } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { ProgressBar } from '../components/ui/Progress';
import { SkeletonStatCard, Skeleton } from '../components/ui/Skeleton';
import {
  cn, formatTimeAgo, formatStatChange,
  formatActivityLogSummary, PROJECT_STATUS_LABELS,
} from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useProjects } from '../hooks/useProjects';
import {
  useDashboardStats,
  useActivityLogs,
  useTaskChartData,
  useProjectStatusBreakdown,
  useIssueSeverityTrend,
} from '../hooks/useDashboard';
import { differenceInDays } from 'date-fns';

// ─── Chart colour config ──────────────────────────────────────────────────────

function useChartColors(isDark: boolean) {
  return {
    grid:          isDark ? '#1e293b' : '#f1f5f9',
    tick:          isDark ? '#64748b' : '#94a3b8',
    tooltipBg:     isDark ? '#0f172a' : '#ffffff',
    tooltipBorder: isDark ? '#1e293b' : '#e2e8f0',
    tooltipText:   isDark ? '#f1f5f9' : '#0f172a',
    createdLine:   isDark ? '#f1f5f9' : '#0f172a',
  };
}

// ─── Portfolio donut colours ──────────────────────────────────────────────────

const PORTFOLIO_COLORS: Record<string, string> = {
  active:    '#06b6d4',
  on_hold:   '#f59e0b',
  completed: '#22c55e',
  archived:  '#94a3b8',
};

// ─── Severity bar colours ─────────────────────────────────────────────────────

const SEV_COLORS = {
  minor:    '#94a3b8',
  major:    '#fb923c',
  critical: '#f43f5e',
  blocker:  '#7c3aed',
};

// ─── Project health helpers ───────────────────────────────────────────────────

function projectHealthColor(completion: number, daysLeft: number | null): string {
  if (daysLeft !== null && daysLeft < 0) return 'text-red-500';
  if (completion >= 75) return 'text-emerald-500';
  if (completion >= 40) return 'text-amber-500';
  return 'text-red-500';
}

function projectHealthBarColor(completion: number, daysLeft: number | null): string {
  if (daysLeft !== null && daysLeft < 0) return 'bg-red-500';
  if (completion >= 75) return 'bg-emerald-500';
  if (completion >= 40) return 'bg-amber-400';
  return 'bg-red-400';
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { colorMode } = useThemeStore();
  const isDark = colorMode === 'dark';
  const chart  = useChartColors(isDark);

  const isAdmin = user?.role === 'admin';

  const stats      = useDashboardStats();
  const activity   = useActivityLogs(15);
  const taskChart  = useTaskChartData();
  const portfolio  = useProjectStatusBreakdown();
  const sevTrend   = useIssueSeverityTrend();
  const projects   = useProjects();

  const s = stats.data;

  // ── Derived KPI values ────────────────────────────────────────────────────
  const deliveryRate = s && s.total_tasks > 0
    ? Math.round((s.completed_tasks / s.total_tasks) * 100)
    : 0;

  const prevDeliveryRate = s && s.total_tasks > 0
    ? Math.round(((s.completed_tasks - (s.month_completions ?? 0)) / Math.max(s.total_tasks, 1)) * 100)
    : 0;

  const deliveryChange = s ? formatStatChange(deliveryRate, prevDeliveryRate) : null;

  // ── Project health board (top 6 active, sorted by completion asc = most at-risk first) ─
  const healthProjects = (projects.data ?? [])
    .filter((p) => p.status === 'active')
    .map((p) => {
      const total     = p.task_count ?? 0;
      const done      = p.completed_task_count ?? 0;
      const pct       = total > 0 ? Math.round((done / total) * 100) : 0;
      const daysLeft  = p.deadline ? differenceInDays(new Date(p.deadline), new Date()) : null;
      return { ...p, pct, daysLeft };
    })
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 6);

  // ── At-Risk Projects KPI ──────────────────────────────────────────────────
  // An active project is "at-risk" when it has a deadline and either:
  //   (a) is already overdue (daysLeft < 0), or
  //   (b) deadline is within 30 days but completion is below 70 %
  const overdueCount      = healthProjects.filter((p) => p.daysLeft !== null && p.daysLeft < 0).length;
  const expiringSoonCount = healthProjects.filter(
    (p) => p.daysLeft !== null && p.daysLeft >= 0 && p.daysLeft <= 30 && p.pct < 70
  ).length;
  const atRiskCount = overdueCount + expiringSoonCount;

  const atRiskSubText = (() => {
    if (atRiskCount === 0) return 'All active projects on track';
    const parts: string[] = [];
    if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
    if (expiringSoonCount > 0) parts.push(`${expiringSoonCount} expiring soon`);
    return parts.join(' · ');
  })();

  // ── On-hold projects (for Active Projects KPI sub-text) ──────────────────
  const onHoldCount = (projects.data ?? []).filter((p) => p.status === 'on_hold').length;

  // ── Portfolio donut total ─────────────────────────────────────────────────
  const portfolioTotal = (portfolio.data ?? []).reduce((acc, d) => acc + d.count, 0);

  // ── Tooltip style shared ──────────────────────────────────────────────────
  const tooltipStyle = {
    background: chart.tooltipBg,
    border: `1px solid ${chart.tooltipBorder}`,
    borderRadius: '8px',
    fontSize: '12px',
    color: chart.tooltipText,
  };

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-hi">Business Overview</h1>
          <p className="text-sm text-dim mt-0.5">
            Real-time delivery intelligence across your project portfolio.
          </p>
        </div>
        <span className="hidden sm:flex items-center gap-1.5 text-xs text-weak">
          <Clock className="h-3.5 w-3.5" />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {(stats.isLoading || projects.isLoading) ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            {/* Delivery Rate — overall task throughput with raw-count context */}
            <StatCard
              title="Delivery Rate"
              value={`${deliveryRate}%`}
              change={
                s && s.total_tasks > 0
                  ? `${s.completed_tasks} of ${s.total_tasks} tasks done`
                  : deliveryChange?.text
              }
              changeType={deliveryChange?.type ?? 'neutral'}
              icon={<CheckCircle2 className="h-5 w-5 text-cyan-500" />}
              iconBg="bg-cyan-50 dark:bg-cyan-950/40"
            />
            {/* Active Projects — flags stalled (on-hold) projects immediately */}
            <StatCard
              title="Active Projects"
              value={s?.active_projects ?? 0}
              change={
                onHoldCount > 0
                  ? `${onHoldCount} on hold — review needed`
                  : `${s?.total_projects ?? 0} total · portfolio fully active`
              }
              changeType={onHoldCount > 0 ? 'negative' : 'positive'}
              icon={<FolderKanban className="h-5 w-5 text-violet-500" />}
              iconBg="bg-violet-50 dark:bg-violet-950/40"
            />
            {/* Critical Issues — unresolved blockers surface quality risk */}
            <StatCard
              title="Critical Issues"
              value={s?.critical_issues ?? 0}
              change={
                s?.critical_issues === 0
                  ? 'No blockers — quality healthy'
                  : `${s?.open_issues ?? 0} total open · ${s?.critical_issues} need urgent action`
              }
              changeType={s?.critical_issues === 0 ? 'positive' : 'negative'}
              icon={<AlertOctagon className="h-5 w-5 text-rose-500" />}
              iconBg="bg-rose-50 dark:bg-rose-950/40"
            />
            {/* At-Risk Projects — derived from deadline + completion; most actionable */}
            <StatCard
              title="At-Risk Projects"
              value={atRiskCount}
              change={atRiskSubText}
              changeType={atRiskCount === 0 ? 'positive' : 'negative'}
              icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
              iconBg="bg-amber-50 dark:bg-amber-950/40"
            />
          </>
        )}
      </div>

      {/* ── Charts Row: Delivery Velocity + Portfolio Donut ────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Delivery Velocity */}
        <div className="xl:col-span-2 bg-surface rounded-xl border border-base shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-hi">Delivery Velocity</h3>
              <p className="text-xs text-dim">Tasks created vs completed — last 6 months</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-body">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chart.createdLine }} />
                Created
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                Completed
              </span>
            </div>
          </div>
          {taskChart.isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={taskChart.data ?? []}>
                <defs>
                  <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={chart.createdLine} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={chart.createdLine} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="month"   tick={{ fontSize: 12, fill: chart.tick }} axisLine={false} tickLine={false} />
                <YAxis                   tick={{ fontSize: 12, fill: chart.tick }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="created"   stroke={chart.createdLine} strokeWidth={2} fill="url(#gradCreated)"   />
                <Area type="monotone" dataKey="completed" stroke="#22d3ee"            strokeWidth={2} fill="url(#gradCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Portfolio Donut */}
        <div className="bg-surface rounded-xl border border-base shadow-sm p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-hi">Project Portfolio</h3>
            <p className="text-xs text-dim">Status breakdown across all projects</p>
          </div>
          {portfolio.isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (portfolio.data ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-sm text-weak">No projects yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={portfolio.data}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="45%"
                  innerRadius={58}
                  outerRadius={82}
                  strokeWidth={0}
                  paddingAngle={3}
                  label={false}
                >
                  {(portfolio.data ?? []).map((entry) => (
                    <Cell key={entry.status} fill={PORTFOLIO_COLORS[entry.status] ?? '#94a3b8'} />
                  ))}
                </Pie>
                {/* Centre label rendered via recharts customized label */}
                <text x="50%" y="43%" dominantBaseline="middle" textAnchor="middle"
                  style={{ fontSize: 26, fontWeight: 700, fill: isDark ? '#f1f5f9' : '#0f172a' }}>
                  {portfolioTotal}
                </text>
                <text x="50%" y="53%" dominantBaseline="middle" textAnchor="middle"
                  style={{ fontSize: 11, fill: isDark ? '#64748b' : '#94a3b8' }}>
                  projects
                </text>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => PROJECT_STATUS_LABELS[value as keyof typeof PROJECT_STATUS_LABELS] ?? value}
                  wrapperStyle={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', paddingTop: 8 }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => {
                    const n = String(name ?? '');
                    const v = Number(value ?? 0);
                    return [
                      `${v} project${v !== 1 ? 's' : ''}`,
                      PROJECT_STATUS_LABELS[n as keyof typeof PROJECT_STATUS_LABELS] ?? n,
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Issue Severity Trend ────────────────────────────────────────────── */}
      <div className="bg-surface rounded-xl border border-base shadow-sm p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-hi">Issue Severity Trend</h3>
            <p className="text-xs text-dim">Active issues by severity — last 6 weeks</p>
          </div>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-xs text-body">
            {Object.entries(SEV_COLORS).map(([k, color]) => (
              <span key={k} className="flex items-center gap-1.5 capitalize">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {k}
              </span>
            ))}
          </div>
        </div>
        {sevTrend.isLoading ? (
          <Skeleton className="h-[180px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sevTrend.data ?? []} barSize={12} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
              <YAxis                tick={{ fontSize: 11, fill: chart.tick }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="minor"    fill={SEV_COLORS.minor}    radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="major"    fill={SEV_COLORS.major}    radius={[0, 0, 0, 0]} stackId="a" />
              <Bar dataKey="critical" fill={SEV_COLORS.critical} radius={[0, 0, 0, 0]} stackId="a" />
              <Bar dataKey="blocker"  fill={SEV_COLORS.blocker}  radius={[3, 3, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Bottom Row: Project Health Board + Activity Feed ───────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Project Health Board */}
        <div className={cn('bg-surface rounded-xl border border-base shadow-sm p-5', !isAdmin && 'xl:col-span-2')}>
          <div className="mb-4">
            <h3 className="font-semibold text-hi">Project Health Board</h3>
            <p className="text-xs text-dim">Active projects ranked by delivery risk</p>
          </div>

          {projects.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          ) : healthProjects.length === 0 ? (
            <p className="text-sm text-weak text-center py-6">No active projects</p>
          ) : (
            <div className="space-y-4">
              {healthProjects.map((p) => {
                const healthCol = projectHealthColor(p.pct, p.daysLeft);
                const barCol    = projectHealthBarColor(p.pct, p.daysLeft);
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-hi truncate max-w-[200px]">{p.name}</span>
                        {p.daysLeft !== null && (
                          <span className={cn('flex items-center gap-1 text-xs shrink-0', healthCol)}>
                            <CalendarDays className="h-3 w-3" />
                            {p.daysLeft < 0
                              ? `${Math.abs(p.daysLeft)}d overdue`
                              : `${p.daysLeft}d left`}
                          </span>
                        )}
                      </div>
                      <span className={cn('text-sm font-semibold tabular-nums shrink-0 ml-3', healthCol)}>
                        {p.pct}%
                      </span>
                    </div>
                    <ProgressBar
                      value={p.pct}
                      max={100}
                      color={barCol}
                    />
                    <p className="text-xs text-weak mt-1">
                      {p.completed_task_count ?? 0} of {p.task_count ?? 0} tasks completed
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity (admins only) */}
        {isAdmin && (
          <div className="bg-surface rounded-xl border border-base shadow-sm p-5">
            <div className="mb-4">
              <h3 className="font-semibold text-hi">Team Pulse</h3>
              <p className="text-xs text-dim">Latest actions across the organisation</p>
            </div>
            <div className="overflow-y-auto divide-y divide-subtle pr-1" style={{ maxHeight: '300px' }}>
              {activity.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                    <Skeleton className="h-2.5 w-14" />
                  </div>
                ))
              ) : activity.data?.length === 0 ? (
                <p className="text-sm text-weak text-center py-6">No activity yet</p>
              ) : (
                activity.data?.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 py-3">
                    <Avatar src={log.user?.avatar_url} name={log.user?.full_name || ''} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-hi truncate">{log.user?.full_name ?? 'System'}</p>
                      <p className="text-xs text-dim truncate">
                        {formatActivityLogSummary(log.action, log.entity_name)}
                      </p>
                    </div>
                    <span className="text-xs text-weak whitespace-nowrap">
                      {formatTimeAgo(log.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
