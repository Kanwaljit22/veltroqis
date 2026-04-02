import React from 'react';
import {
  Users, Activity, UserPlus, Shield, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { StatCard } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/Progress';
import { SkeletonStatCard, Skeleton } from '../components/ui/Skeleton';
import {
  cn, formatTimeAgo, formatStatChange,
  ROLE_LABELS, ROLE_COLORS, ROLE_BAR_COLORS, formatActivityLogSummary,
} from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import {
  useDashboardStats,
  useRoleDistribution,
  useActivityLogs,
  useTaskChartData,
  useBugTrendData,
} from '../hooks/useDashboard';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const stats = useDashboardStats();
  const roles = useRoleDistribution();
  const activity = useActivityLogs(20);
  const taskChart = useTaskChartData();
  const bugChart = useBugTrendData();

  const maxRoleCount = Math.max(...(roles.data ?? []).map((r) => r.count), 1);
  const s = stats.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Welcome back! Here's an overview of your system.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            {(() => {
              const totalUsersChange    = formatStatChange(s?.total_users     ?? 0, s?.prev_total_users     ?? 0);
              const activeUsersChange   = formatStatChange(s?.active_users    ?? 0, s?.prev_active_users    ?? 0);
              const pendingInvChange    = formatStatChange(s?.pending_invites ?? 0, s?.prev_pending_invites ?? 0);
              const adminUsersChange    = formatStatChange(s?.admin_users     ?? 0, s?.prev_admin_users     ?? 0);
              return (
                <>
                  <StatCard title="Total Users" value={s?.total_users ?? 0}
                    change={totalUsersChange.text} changeType={totalUsersChange.type}
                    icon={<Users className="h-5 w-5 text-blue-500" />} iconBg="bg-blue-50" />
                  <StatCard title="Active Now" value={s?.active_users ?? 0}
                    change={activeUsersChange.text} changeType={activeUsersChange.type}
                    icon={<Activity className="h-5 w-5 text-green-500" />} iconBg="bg-green-50" />
                  <StatCard title="Pending Invites" value={s?.pending_invites ?? 0}
                    change={pendingInvChange.text} changeType={pendingInvChange.type}
                    icon={<UserPlus className="h-5 w-5 text-yellow-500" />} iconBg="bg-yellow-50" />
                  <StatCard title="Admin Users" value={s?.admin_users ?? 0}
                    change={adminUsersChange.text} changeType={adminUsersChange.type}
                    icon={<Shield className="h-5 w-5 text-purple-500" />} iconBg="bg-purple-50" />
                </>
              );
            })()}
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Task Activity</h3>
              <p className="text-xs text-slate-500">Created vs completed tasks</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-800" />Created
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />Completed
              </span>
            </div>
          </div>
          {taskChart.isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={taskChart.data ?? []}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="created" stroke="#0f172a" strokeWidth={2} fill="url(#colorCreated)" />
                <Area type="monotone" dataKey="completed" stroke="#22d3ee" strokeWidth={2} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900">Bug Trends</h3>
            <p className="text-xs text-slate-500">Weekly open vs closed</p>
          </div>
          {bugChart.isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bugChart.data ?? []} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="open" fill="#fca5a5" radius={[3, 3, 0, 0]} />
                <Bar dataKey="closed" fill="#86efac" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Activity — admins only (global audit feed) */}
        {isAdmin && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">Recent Activity</h3>
              <p className="text-xs text-slate-500">Latest user actions in your system</p>
            </div>
            <div
              className="overflow-y-auto divide-y divide-slate-50 pr-1"
              style={{ maxHeight: '272px' }}
            >
              {activity.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                ))
              ) : activity.data?.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No activity yet</p>
              ) : (
                activity.data?.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 py-3">
                    <Avatar src={log.user?.avatar_url} name={log.user?.full_name || ''} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{log.user?.full_name ?? 'System'}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {formatActivityLogSummary(log.action, log.entity_name)}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {formatTimeAgo(log.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Role Distribution */}
        <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm p-5', !isAdmin && 'xl:col-span-2')}>
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900">Role Distribution</h3>
            <p className="text-xs text-slate-500">Breakdown of users by role</p>
          </div>
          <div className="space-y-3">
            {roles.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            ) : (
              roles.data?.map((item) => (
                <div key={item.role}>
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge className={ROLE_COLORS[item.role]}>{ROLE_LABELS[item.role]}</Badge>
                    <span className="text-sm text-slate-500">{item.count} users</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(item.count / maxRoleCount) * 100}%`,
                        backgroundColor: ROLE_BAR_COLORS[item.role],
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Project Overview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="mb-4">
          <h3 className="font-semibold text-slate-900">Project Overview</h3>
          <p className="text-xs text-slate-500">Active projects and progress</p>
        </div>
        {stats.isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-xl bg-slate-50">
                <p className="text-3xl font-bold text-slate-900">{s?.total_projects ?? 0}</p>
                <p className="text-sm text-slate-500 mt-1">Total Projects</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-green-50">
                <p className="text-3xl font-bold text-green-600">{s?.active_projects ?? 0}</p>
                <p className="text-sm text-slate-500 mt-1">Active Projects</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-blue-50">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-3xl font-bold text-blue-600">{s?.completed_tasks ?? 0}</p>
                  <span className="text-slate-400 text-lg">/</span>
                  <p className="text-xl font-semibold text-slate-400">{s?.total_tasks ?? 0}</p>
                </div>
                <p className="text-sm text-slate-500 mt-1">Tasks Completed</p>
                <ProgressBar
                  value={s?.completed_tasks ?? 0}
                  max={Math.max(s?.total_tasks ?? 1, 1)}
                  color="bg-blue-500"
                  className="mt-2"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span>
                  {s?.total_tasks
                    ? Math.round((s.completed_tasks / s.total_tasks) * 100)
                    : 0}% completion rate
                </span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Minus className="h-4 w-4" />
                <span>{s?.open_issues ?? 0} open issues</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5 text-orange-500">
                <TrendingDown className="h-4 w-4" />
                <span>{s?.pending_invites ?? 0} pending invites</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
