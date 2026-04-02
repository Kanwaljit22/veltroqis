import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Resolver } from 'react-hook-form';
import {
  CalendarClock, Play, CheckCircle2, AlertTriangle, Users, Clock,
  Plus, X, Link2, MessageSquare, ChevronDown, ChevronRight,
  Zap, ShieldAlert, Video, Copy, ExternalLink, Timer,
  TrendingUp, BarChart3, ListChecks, Bell, History, Sparkles,
  CircleCheck, CircleDot, CircleMinus, RefreshCw, CheckCheck,
  ArrowRight, Flag,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Avatar } from '../components/ui/Avatar';
import { Tabs } from '../components/ui/Tabs';
import {
  cn, formatDate, formatTimeAgo, STATUS_LABELS, STATUS_COLORS,
  PRIORITY_COLORS, PRIORITY_LABELS,
} from '../lib/utils';
import {
  useStandupSessions, useTodayStandup, useCreateStandupSession,
  useStartStandupSession, useCompleteStandupSession,
  useSubmitStandupEntry, useResolveBlocker,
} from '../hooks/useStandup';
import { useProjects } from '../hooks/useProjects';
import { useUsers } from '../hooks/useUsers';
import { useTasks } from '../hooks/useTasks';
import { useAuthStore } from '../store/authStore';
import type {
  StandupSession, StandupEntry, StandupBlocker, StandupBlockerSeverity,
  Task,
} from '../types';

// ─── Severity Config ──────────────────────────────────────────────────────────

const BLOCKER_SEVERITY: Record<StandupBlockerSeverity, { label: string; color: string; dot: string }> = {
  low:    { label: 'Low',    color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  medium: { label: 'Medium', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  high:   { label: 'High',   color: 'bg-red-100 text-red-700',       dot: 'bg-red-600'   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function getSessionDateLabel(date: string) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (date === today) return 'Today';
  if (date === yesterday) return 'Yesterday';
  return formatDate(date);
}

// ─── Smart Insights ───────────────────────────────────────────────────────────

function computeInsights(session: StandupSession, tasks: Task[]) {
  const insights: { type: 'warning' | 'info'; message: string }[] = [];

  // Detect tasks blocked multiple days
  const allBlockers = session.entries.flatMap((e) => e.blockers.filter((b) => !b.resolved));
  allBlockers.forEach((b) => {
    if (b.days_blocked >= 3) {
      insights.push({ type: 'warning', message: `Blocker unresolved for ${b.days_blocked} days: "${b.description.slice(0, 60)}..."` });
    }
  });

  // Members who haven't submitted
  const submitted = new Set(session.entries.filter((e) => e.submitted_at).map((e) => e.user_id));
  const missing = session.entries.filter((e) => !submitted.has(e.user_id));
  if (missing.length > 0) {
    insights.push({ type: 'info', message: `${missing.length} team member(s) haven't submitted their update yet.` });
  }

  // Tasks stuck in in_progress for a long time (more than 5 days)
  const stuckTasks = tasks.filter((t) => {
    if (t.status !== 'in_progress') return false;
    const updated = new Date(t.updated_at).getTime();
    const daysDiff = (Date.now() - updated) / 86400000;
    return daysDiff > 5;
  });
  stuckTasks.slice(0, 2).forEach((t) => {
    insights.push({ type: 'warning', message: `Task "${t.title}" has been in progress for more than 5 days.` });
  });

  return insights;
}

// ─── Attendance Badge ─────────────────────────────────────────────────────────

const AttendanceBadge: React.FC<{ attended: boolean; submitted: boolean }> = ({ attended, submitted }) => {
  if (attended && submitted) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
        <CircleCheck className="h-3 w-3" /> Submitted
      </span>
    );
  }
  if (attended) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
        <CircleDot className="h-3 w-3" /> Attending
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
      <CircleMinus className="h-3 w-3" /> Pending
    </span>
  );
};

// ─── Blocker Card ─────────────────────────────────────────────────────────────

const BlockerCard: React.FC<{
  blocker: StandupBlocker;
  entry: StandupEntry;
  sessionId: string;
  projectId: string;
  canResolve: boolean;
}> = ({ blocker, entry, sessionId, projectId, canResolve }) => {
  const resolveBlocker = useResolveBlocker();
  const cfg = BLOCKER_SEVERITY[blocker.severity];

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-xl border transition-all',
      blocker.resolved
        ? 'bg-green-50 border-green-200 opacity-60'
        : 'bg-red-50 border-red-200'
    )}>
      <div className={cn('h-2 w-2 rounded-full mt-1.5 shrink-0', blocker.resolved ? 'bg-green-500' : cfg.dot)} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', blocker.resolved ? 'text-slate-500 line-through' : 'text-slate-800')}>
          {blocker.description}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge className={cfg.color} size="sm">{cfg.label}</Badge>
          {blocker.days_blocked > 0 && (
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> {blocker.days_blocked}d blocked
            </span>
          )}
          {blocker.task && (
            <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
              <Link2 className="h-3 w-3" /> {blocker.task.title}
            </span>
          )}
          {entry.user && (
            <span className="text-[10px] text-slate-400">{entry.user.full_name}</span>
          )}
        </div>
      </div>
      {!blocker.resolved && canResolve && (
        <button
          onClick={() => resolveBlocker.mutate({ sessionId, entryId: entry.id, blockerId: blocker.id, projectId })}
          className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-white hover:bg-green-50 border border-green-200 px-2 py-1 rounded-lg transition-colors"
          title="Mark as resolved"
        >
          <CheckCheck className="h-3 w-3" /> Resolve
        </button>
      )}
    </div>
  );
};

// ─── Member Entry Card ────────────────────────────────────────────────────────

const MemberEntryCard: React.FC<{
  entry: StandupEntry;
  isExpanded: boolean;
  onToggle: () => void;
  isCurrentUser: boolean;
  onEdit: () => void;
  sessionId: string;
  projectId: string;
  isPM: boolean;
  liveTimer?: number;
  isLiveActive: boolean;
}> = ({ entry, isExpanded, onToggle, isCurrentUser, onEdit, sessionId, projectId, isPM, liveTimer, isLiveActive }) => {
  const hasBlockers = entry.blockers.some((b) => !b.resolved);
  const submitted = !!entry.submitted_at;

  return (
    <div className={cn(
      'bg-white rounded-xl border shadow-sm transition-all',
      hasBlockers ? 'border-red-200' : 'border-slate-200',
      isExpanded && 'shadow-md'
    )}>
      {/* Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 rounded-xl transition-colors"
        onClick={onToggle}
      >
        {entry.user ? (
          <Avatar src={entry.user.avatar_url} name={entry.user.full_name} size="sm" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-slate-200 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-800">
              {entry.user?.full_name ?? 'Unknown'}
              {isCurrentUser && <span className="text-[10px] text-blue-500 ml-1">(you)</span>}
            </span>
            <span className="text-[10px] text-slate-400 capitalize">{entry.user?.role?.replace('_', ' ')}</span>
          </div>
          {submitted && (
            <p className="text-[10px] text-slate-400">{formatTimeAgo(entry.submitted_at!)}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasBlockers && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
              <ShieldAlert className="h-3 w-3" />
              {entry.blockers.filter((b) => !b.resolved).length} blocker{entry.blockers.filter((b) => !b.resolved).length > 1 ? 's' : ''}
            </span>
          )}
          {isLiveActive && liveTimer !== undefined && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {formatSeconds(liveTimer)}
            </span>
          )}
          <AttendanceBadge attended={entry.attended} submitted={submitted} />
          {isCurrentUser && submitted && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="text-[10px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              Edit
            </button>
          )}
          {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && submitted && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
          {/* Yesterday */}
          {entry.yesterday.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" /> Yesterday
              </p>
              <ul className="space-y-1.5">
                {entry.yesterday.map((y, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-0.5 h-4 w-4 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-2.5 w-2.5 text-green-600" />
                    </span>
                    <div>
                      {y.note}
                      {y.task && (
                        <span className={cn('ml-2 text-[10px] px-1.5 py-0.5 rounded border', STATUS_COLORS[y.task.status])}>
                          {y.task.title}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Today */}
          {entry.today.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <ArrowRight className="h-3 w-3 text-blue-500" /> Today
              </p>
              <ul className="space-y-1.5">
                {entry.today.map((td, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-0.5 h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Flag className="h-2.5 w-2.5 text-blue-600" />
                    </span>
                    <div>
                      {td.note}
                      {td.task && (
                        <span className={cn('ml-2 text-[10px] px-1.5 py-0.5 rounded border', STATUS_COLORS[td.task.status])}>
                          {td.task.title}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Blockers */}
          {entry.blockers.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 text-red-500" /> Blockers
              </p>
              <div className="space-y-2">
                {entry.blockers.map((b) => (
                  <BlockerCard
                    key={b.id}
                    blocker={b}
                    entry={entry}
                    sessionId={sessionId}
                    projectId={projectId}
                    canResolve={isPM}
                  />
                ))}
              </div>
            </div>
          )}

          {entry.yesterday.length === 0 && entry.today.length === 0 && entry.blockers.length === 0 && (
            <p className="text-sm text-slate-400 italic">No updates provided.</p>
          )}
        </div>
      )}

      {/* Not submitted */}
      {isExpanded && !submitted && (
        <div className="px-4 pb-4 pt-3 border-t border-slate-100 text-center">
          <Bell className="h-6 w-6 text-slate-300 mx-auto mb-1" />
          <p className="text-sm text-slate-400">Update not submitted yet</p>
          {isCurrentUser && (
            <Button size="sm" className="mt-2" onClick={onEdit} icon={<Plus className="h-3.5 w-3.5" />}>
              Add my update
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Live Mode Timer ──────────────────────────────────────────────────────────

const LiveModePanel: React.FC<{
  session: StandupSession;
  currentMemberIdx: number;
  onNext: () => void;
  onEnd: () => void;
  timer: number;
  maxSeconds: number;
}> = ({ session, currentMemberIdx, onNext, onEnd, timer, maxSeconds }) => {
  const currentEntry = session.entries[currentMemberIdx];
  const progress = Math.min((timer / maxSeconds) * 100, 100);
  const isOvertime = timer > maxSeconds;

  return (
    <div className="bg-white rounded-xl border border-indigo-200 shadow-md p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-bold text-slate-800">Live Stand-up</span>
          <span className="text-xs text-slate-400">
            {currentMemberIdx + 1}/{session.entries.length}
          </span>
        </div>
        <div className={cn('font-mono text-lg font-bold', isOvertime ? 'text-red-600' : 'text-slate-800')}>
          {formatSeconds(timer)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000',
            isOvertime ? 'bg-red-500' : 'bg-indigo-500'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3">
        {currentEntry?.user && (
          <>
            <Avatar src={currentEntry.user.avatar_url} name={currentEntry.user.full_name} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">{currentEntry.user.full_name}</p>
              <p className="text-xs text-slate-400 capitalize">{currentEntry.user.role?.replace('_', ' ')}</p>
            </div>
          </>
        )}
        <div className="flex items-center gap-2">
          {currentMemberIdx < session.entries.length - 1 ? (
            <Button size="sm" variant="outline" onClick={onNext} icon={<ArrowRight className="h-3.5 w-3.5" />}>
              Next
            </Button>
          ) : (
            <Button size="sm" onClick={onEnd} icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              className="bg-green-600 hover:bg-green-700 text-white">
              End Stand-up
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Summary Panel ────────────────────────────────────────────────────────────

const SummaryPanel: React.FC<{ session: StandupSession }> = ({ session }) => {
  const s = session.summary;
  if (!s) return null;

  const attendancePct = s.total_members > 0 ? Math.round((s.attendees / s.total_members) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <h3 className="font-semibold text-slate-800 text-sm">Auto-generated Summary</h3>
        <span className="text-xs text-slate-400 ml-auto">{getSessionDateLabel(session.date)}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Completed', value: s.completed_tasks, icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, color: 'text-green-700' },
          { label: 'In Progress', value: s.in_progress_tasks, icon: <RefreshCw className="h-4 w-4 text-blue-500" />, color: 'text-blue-700' },
          { label: 'Blockers', value: s.blockers_count, icon: <ShieldAlert className="h-4 w-4 text-red-500" />, color: 'text-red-700' },
          { label: 'Attendance', value: `${s.attendees}/${s.total_members}`, icon: <Users className="h-4 w-4 text-indigo-500" />, color: 'text-indigo-700' },
        ].map((item) => (
          <div key={item.label} className="bg-slate-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center mb-1">{item.icon}</div>
            <p className={cn('text-xl font-bold', item.color)}>{item.value}</p>
            <p className="text-[10px] text-slate-400">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Attendance bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>Participation</span>
          <span className="font-medium">{attendancePct}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
            style={{ width: `${attendancePct}%` }}
          />
        </div>
      </div>

      {s.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs font-medium text-amber-700 mb-1">PM Notes</p>
          <p className="text-sm text-slate-700">{s.notes}</p>
        </div>
      )}
    </div>
  );
};

// ─── Submit Entry Form ────────────────────────────────────────────────────────

const blockersItemSchema = z.object({
  description: z.string().min(1, 'Describe the blocker'),
  task_id: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high']),
  days_blocked: z.coerce.number().min(0),
});

const entrySchema = z.object({
  yesterday: z.array(z.object({ note: z.string().min(1, 'Required'), task_id: z.string().optional() })),
  today:     z.array(z.object({ note: z.string().min(1, 'Required'), task_id: z.string().optional() })),
  blockers:  z.array(blockersItemSchema),
});
type EntryForm = z.infer<typeof entrySchema>;

const SubmitEntryModal: React.FC<{
  open: boolean;
  onClose: () => void;
  session: StandupSession;
  userId: string;
  projectId: string;
  taskOptions: { value: string; label: string }[];
  existingEntry?: StandupEntry;
}> = ({ open, onClose, session, userId, projectId, taskOptions, existingEntry }) => {
  const submitEntry = useSubmitStandupEntry();

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<EntryForm>({
    resolver: zodResolver(entrySchema) as unknown as Resolver<EntryForm>,
    defaultValues: {
      yesterday: existingEntry?.yesterday.length
        ? existingEntry.yesterday.map((y) => ({ note: y.note, task_id: y.task_id ?? '' }))
        : [{ note: '', task_id: '' }],
      today: existingEntry?.today.length
        ? existingEntry.today.map((t) => ({ note: t.note, task_id: t.task_id ?? '' }))
        : [{ note: '', task_id: '' }],
      blockers: existingEntry?.blockers.length
        ? existingEntry.blockers.map((b) => ({ description: b.description, task_id: b.task_id ?? '', severity: b.severity, days_blocked: b.days_blocked }))
        : [],
    },
  });

  const { fields: yesterdayFields, append: addYesterday, remove: rmYesterday } = useFieldArray({ control, name: 'yesterday' });
  const { fields: todayFields,     append: addToday,     remove: rmToday     } = useFieldArray({ control, name: 'today'     });
  const { fields: blockerFields,   append: addBlocker,   remove: rmBlocker   } = useFieldArray({ control, name: 'blockers'  });

  const onSubmit = async (data: EntryForm) => {
    await submitEntry.mutateAsync({
      session_id: session.id,
      project_id: projectId,
      user_id: userId,
      yesterday: data.yesterday.filter((y) => y.note).map((y) => ({ note: y.note, task_id: y.task_id || undefined })),
      today: data.today.filter((t) => t.note).map((t) => ({ note: t.note, task_id: t.task_id || undefined })),
      blockers: data.blockers.map((b) => ({
        description: b.description,
        task_id: b.task_id || undefined,
        severity: b.severity,
        days_blocked: b.days_blocked,
        resolved: false,
      })),
    });
    onClose();
    reset();
  };

  const taskOpts = [{ value: '', label: 'No linked task' }, ...taskOptions];

  return (
    <Modal open={open} onClose={onClose} title="Daily Stand-up Update" description="Quick update · Aim for under 2 minutes" size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Yesterday */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> What did I do yesterday?
            </p>
            <button type="button" onClick={() => addYesterday({ note: '', task_id: '' })}
              className="text-[10px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {yesterdayFields.map((field, i) => (
              <div key={field.id} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-5 gap-2">
                  <div className="col-span-3">
                    <input
                      {...register(`yesterday.${i}.note`)}
                      placeholder="Describe what you completed..."
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.yesterday?.[i]?.note && (
                      <p className="text-[10px] text-red-500 mt-0.5">{errors.yesterday[i]?.note?.message}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <select {...register(`yesterday.${i}.task_id`)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      {taskOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                {yesterdayFields.length > 1 && (
                  <button type="button" onClick={() => rmYesterday(i)}
                    className="mt-2 p-1 text-slate-400 hover:text-red-500 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Today */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <ArrowRight className="h-4 w-4 text-blue-500" /> What will I do today?
            </p>
            <button type="button" onClick={() => addToday({ note: '', task_id: '' })}
              className="text-[10px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {todayFields.map((field, i) => (
              <div key={field.id} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-5 gap-2">
                  <div className="col-span-3">
                    <input
                      {...register(`today.${i}.note`)}
                      placeholder="Describe your plan for today..."
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.today?.[i]?.note && (
                      <p className="text-[10px] text-red-500 mt-0.5">{errors.today[i]?.note?.message}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <select {...register(`today.${i}.task_id`)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      {taskOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                {todayFields.length > 1 && (
                  <button type="button" onClick={() => rmToday(i)}
                    className="mt-2 p-1 text-slate-400 hover:text-red-500 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Blockers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-red-500" /> Any blockers?
            </p>
            <button type="button" onClick={() => addBlocker({ description: '', task_id: '', severity: 'medium', days_blocked: 0 })}
              className="text-[10px] font-medium text-red-600 hover:text-red-800 flex items-center gap-0.5">
              <Plus className="h-3 w-3" /> Add Blocker
            </button>
          </div>
          {blockerFields.length === 0 && (
            <p className="text-xs text-slate-400 italic">No blockers — great!</p>
          )}
          <div className="space-y-3">
            {blockerFields.map((field, i) => (
              <div key={field.id} className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <input
                      {...register(`blockers.${i}.description`)}
                      placeholder="Describe the blocker clearly..."
                      className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                    />
                    {errors.blockers?.[i]?.description && (
                      <p className="text-[10px] text-red-500 mt-0.5">{errors.blockers[i]?.description?.message}</p>
                    )}
                  </div>
                  <button type="button" onClick={() => rmBlocker(i)}
                    className="mt-2 p-1 text-slate-400 hover:text-red-500 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <select {...register(`blockers.${i}.task_id`)}
                    className="text-sm border border-red-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white">
                    {taskOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select {...register(`blockers.${i}.severity`)}
                    className="text-sm border border-red-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white">
                    <option value="low">Low severity</option>
                    <option value="medium">Medium severity</option>
                    <option value="high">High severity</option>
                  </select>
                  <input {...register(`blockers.${i}.days_blocked`)} type="number" min={0}
                    placeholder="Days blocked"
                    className="text-sm border border-red-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" type="button" onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button type="submit" loading={submitEntry.isPending} icon={<CheckCircle2 className="h-4 w-4" />}>
            Submit Update
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

// ─── Create Session Modal ─────────────────────────────────────────────────────

const sessionSchema = z.object({
  mode: z.enum(['async', 'live']),
  meeting_link: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  project_id: z.string().min(1, 'Select a project'),
});
type SessionForm = z.infer<typeof sessionSchema>;

const CreateSessionModal: React.FC<{
  open: boolean;
  onClose: () => void;
  projectOptions: { value: string; label: string }[];
  defaultProjectId?: string;
}> = ({ open, onClose, projectOptions, defaultProjectId }) => {
  const createSession = useCreateStandupSession();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SessionForm>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { mode: 'async', project_id: defaultProjectId ?? '' },
  });

  const onSubmit = async (data: SessionForm) => {
    await createSession.mutateAsync({
      project_id: data.project_id,
      mode: data.mode,
      meeting_link: data.meeting_link || undefined,
    });
    onClose();
    reset();
  };

  return (
    <Modal open={open} onClose={onClose} title="Start Daily Stand-up" description="Create today's stand-up session" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select label="Project" options={projectOptions} error={errors.project_id?.message} {...register('project_id')} />

        <div>
          <p className="text-xs font-medium text-slate-700 mb-2">Mode</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { value: 'async', label: 'Async Mode', desc: 'Team submits updates before the meeting. PM reviews.', icon: <MessageSquare className="h-5 w-5" /> },
              { value: 'live',  label: 'Live Mode',  desc: 'Real-time updates during call with per-person timer.',  icon: <Video className="h-5 w-5" /> },
            ] as const).map((m) => (
              <label key={m.value} className="relative cursor-pointer">
                <input type="radio" value={m.value} {...register('mode')} className="sr-only peer" />
                <div className="p-3 rounded-xl border-2 border-slate-200 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-500 peer-checked:text-blue-600">{m.icon}</span>
                    <span className="text-sm font-semibold text-slate-800">{m.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{m.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <Input
          label="Meeting Link (optional)"
          placeholder="https://meet.google.com/..."
          leftIcon={<Video className="h-4 w-4" />}
          error={errors.meeting_link?.message}
          {...register('meeting_link')}
        />

        <ModalFooter>
          <Button variant="outline" type="button" onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button type="submit" loading={createSession.isPending} icon={<CalendarClock className="h-4 w-4" />}>
            Create Session
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

// ─── Complete Session Modal ───────────────────────────────────────────────────

const CompleteSessionModal: React.FC<{
  open: boolean;
  onClose: () => void;
  session: StandupSession;
  projectId: string;
}> = ({ open, onClose, session, projectId }) => {
  const completeSession = useCompleteStandupSession();
  const [notes, setNotes] = useState('');

  const handleComplete = async () => {
    await completeSession.mutateAsync({ id: session.id, projectId, notes });
    onClose();
    setNotes('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Complete Stand-up" description="Finalize the session and generate a summary" size="md">
      <div className="space-y-4">
        <Textarea
          label="PM Notes (optional)"
          placeholder="Add overall notes, key decisions, or action items..."
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleComplete}
            loading={completeSession.isPending}
            icon={<CheckCheck className="h-4 w-4" />}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Complete & Summarize
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const DailyScrumPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const { data: projects = [] } = useProjects();
  const { data: users = [] } = useUsers();

  const [projectFilter,     setProjectFilter]     = useState('');
  const [activeTab,         setActiveTab]         = useState('today');
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [submitEntryOpen,   setSubmitEntryOpen]   = useState(false);
  const [completeOpen,      setCompleteOpen]      = useState(false);
  const [expandedEntries,   setExpandedEntries]   = useState<Set<string>>(new Set(['se-1', 'se-2']));

  // Live mode
  const [liveActive,        setLiveActive]        = useState(false);
  const [liveMemberIdx,     setLiveMemberIdx]     = useState(0);
  const [liveTimer,         setLiveTimer]         = useState(0);
  const LIVE_MAX_SECONDS = 120;

  const effectiveProject = projectFilter || projects[0]?.id || '';
  const { data: todaySession, isLoading: loadingToday } = useTodayStandup(effectiveProject);
  const { data: allSessions = [] } = useStandupSessions(effectiveProject);
  const { data: tasks = [] } = useTasks(effectiveProject || undefined);

  const startSession = useStartStandupSession();

  const pastSessions = useMemo(
    () => allSessions.filter((s) => s.status === 'completed').sort((a, b) => b.date.localeCompare(a.date)),
    [allSessions]
  );

  const insights = useMemo(
    () => (todaySession ? computeInsights(todaySession, tasks) : []),
    [todaySession, tasks]
  );

  const currentUserEntry = todaySession?.entries.find((e) => e.user_id === currentUser?.id);
  const allBlockers = useMemo(
    () =>
      (todaySession?.entries ?? [])
        .flatMap((e) => e.blockers.filter((b) => !b.resolved).map((b) => ({ ...b, entry: e }))),
    [todaySession]
  );

  const submittedCount = (todaySession?.entries ?? []).filter((e) => !!e.submitted_at).length;
  const totalMembers   = (todaySession?.entries ?? []).length;
  const isPM = currentUser?.role === 'admin' || currentUser?.role === 'project_lead';

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const taskOptions = tasks.map((t) => ({
    value: t.id,
    label: `#${t.id.slice(-4)} ${t.title.slice(0, 40)}${t.title.length > 40 ? '...' : ''}`,
  }));

  const toggleEntry = useCallback((id: string) => {
    setExpandedEntries((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  // Live mode timer
  useEffect(() => {
    if (!liveActive) return;
    const interval = setInterval(() => setLiveTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [liveActive]);

  const handleStartLive = () => {
    if (!todaySession) return;
    startSession.mutate({ id: todaySession.id, projectId: effectiveProject });
    setLiveActive(true);
    setLiveMemberIdx(0);
    setLiveTimer(0);
  };

  const handleNextMember = () => {
    setLiveMemberIdx((i) => i + 1);
    setLiveTimer(0);
  };

  const handleEndLive = () => {
    setLiveActive(false);
    setCompleteOpen(true);
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => {
      // toast is shown via the hook
    });
  };

  return (
    <div className="space-y-4">

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-indigo-500" />
            Daily Stand-up
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-44">
            <Select
              options={[{ value: '', label: 'All Projects' }, ...projectOptions]}
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            />
          </div>
          {!todaySession && (
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setCreateSessionOpen(true)}
            >
              Start Stand-up
            </Button>
          )}
          {todaySession && !currentUserEntry?.submitted_at && (
            <Button
              size="sm"
              icon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => setSubmitEntryOpen(true)}
            >
              Submit Update
            </Button>
          )}
          {todaySession && isPM && todaySession.status === 'in_progress' && !liveActive && todaySession.mode === 'live' && (
            <Button
              size="sm"
              variant="outline"
              icon={<Play className="h-4 w-4" />}
              onClick={handleStartLive}
            >
              Start Live
            </Button>
          )}
          {todaySession && isPM && todaySession.status !== 'completed' && (
            <Button
              size="sm"
              variant="outline"
              icon={<CheckCheck className="h-4 w-4" />}
              onClick={() => setCompleteOpen(true)}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              Complete
            </Button>
          )}
        </div>
      </div>

      {/* ── Today's Session Banner ─────────────────────────────────────── */}
      {todaySession && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className={cn(
                'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                todaySession.status === 'in_progress' ? 'bg-linear-to-br from-indigo-500 to-violet-600' : 'bg-slate-100'
              )}>
                {todaySession.status === 'in_progress'
                  ? <Play className="h-4.5 w-4.5 text-white" />
                  : <CheckCircle2 className="h-4.5 w-4.5 text-green-600" />
                }
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800 text-sm">
                    {todaySession.mode === 'live' ? 'Live Stand-up' : 'Async Stand-up'}
                  </span>
                  <Badge
                    className={
                      todaySession.status === 'completed' ? 'bg-green-100 text-green-700' :
                      todaySession.status === 'in_progress' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-slate-100 text-slate-600'
                    }
                    size="sm"
                  >
                    {todaySession.status === 'in_progress' ? 'In Progress' :
                     todaySession.status === 'completed' ? 'Completed' : 'Upcoming'}
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-400">
                  {submittedCount}/{totalMembers} submitted · {allBlockers.length} active blocker{allBlockers.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Meeting link */}
            {todaySession.meeting_link && (
              <div className="flex items-center gap-2">
                <a
                  href={todaySession.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Video className="h-3.5 w-3.5" /> Join Meeting
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  onClick={() => copyLink(todaySession.meeting_link!)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Copy link"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Participation bar */}
            <div className="w-40">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Participation</span>
                <span>{totalMembers > 0 ? Math.round((submittedCount / totalMembers) * 100) : 0}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                  style={{ width: `${totalMembers > 0 ? (submittedCount / totalMembers) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Live Mode Panel ──────────────────────────────────────────────── */}
      {liveActive && todaySession && (
        <LiveModePanel
          session={todaySession}
          currentMemberIdx={liveMemberIdx}
          onNext={handleNextMember}
          onEnd={handleEndLive}
          timer={liveTimer}
          maxSeconds={LIVE_MAX_SECONDS}
        />
      )}

      {/* ── Smart Insights ───────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <div key={i} className={cn(
              'flex items-start gap-2 px-3 py-2 rounded-xl border text-sm',
              insight.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            )}>
              {insight.type === 'warning'
                ? <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                : <Zap className="h-4 w-4 shrink-0 mt-0.5" />}
              <span>{insight.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── No session state ─────────────────────────────────────────────── */}
      {!loadingToday && !todaySession && (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
          <CalendarClock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">No stand-up today</h3>
          <p className="text-sm text-slate-400 mb-4">Start today's session so your team can submit updates.</p>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreateSessionOpen(true)}>
            Start Daily Stand-up
          </Button>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      {todaySession && (
        <>
          <Tabs
            tabs={[
              { id: 'today',    label: "Today's Updates", count: submittedCount || undefined },
              { id: 'blockers', label: 'Blockers',        count: allBlockers.length || undefined },
              { id: 'summary',  label: 'Summary' },
              { id: 'history',  label: 'History',         count: pastSessions.length || undefined },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="underline"
          />

          <div className="mt-2">

            {/* Today's Updates Tab */}
            {activeTab === 'today' && (
              <div className="space-y-3">
                {/* Quick stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Submitted', value: submittedCount, icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, color: 'text-green-700' },
                    { label: 'Pending',   value: totalMembers - submittedCount, icon: <Clock className="h-4 w-4 text-amber-500" />, color: 'text-amber-700' },
                    { label: 'Blockers',  value: allBlockers.length, icon: <ShieldAlert className="h-4 w-4 text-red-500" />, color: 'text-red-700' },
                    { label: 'Tasks Done',value: todaySession.entries.flatMap((e) => e.yesterday).length, icon: <ListChecks className="h-4 w-4 text-blue-500" />, color: 'text-blue-700' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
                      {stat.icon}
                      <div>
                        <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
                        <p className="text-[10px] text-slate-400">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Member cards */}
                {todaySession.entries.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-5">No team members in this session yet.</p>
                ) : (
                  todaySession.entries.map((entry) => (
                    <MemberEntryCard
                      key={entry.id}
                      entry={entry}
                      isExpanded={expandedEntries.has(entry.id)}
                      onToggle={() => toggleEntry(entry.id)}
                      isCurrentUser={entry.user_id === currentUser?.id}
                      onEdit={() => setSubmitEntryOpen(true)}
                      sessionId={todaySession.id}
                      projectId={effectiveProject}
                      isPM={isPM}
                      liveTimer={liveActive && todaySession.entries[liveMemberIdx]?.id === entry.id ? liveTimer : undefined}
                      isLiveActive={liveActive}
                    />
                  ))
                )}

                {/* My update CTA */}
                {!currentUserEntry?.submitted_at && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                      <MessageSquare className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-indigo-800">You haven't submitted your update yet</p>
                      <p className="text-xs text-indigo-500">Keep it concise — Yesterday, Today, Blockers.</p>
                    </div>
                    <Button size="sm" onClick={() => setSubmitEntryOpen(true)} icon={<ArrowRight className="h-3.5 w-3.5" />}>
                      Add Update
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Blockers Tab */}
            {activeTab === 'blockers' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-600">
                    {allBlockers.filter((b) => !b.resolved).length} active · {allBlockers.filter((b) => b.resolved).length} resolved
                  </p>
                  {isPM && allBlockers.length > 0 && (
                    <span className="text-[10px] text-slate-400">Click Resolve to clear blockers</span>
                  )}
                </div>

                {allBlockers.length === 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-2" />
                    <p className="font-semibold text-green-800">No blockers today!</p>
                    <p className="text-sm text-green-600">The team is unblocked — great work!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* High severity first */}
                    {(['high', 'medium', 'low'] as StandupBlockerSeverity[]).map((sev) => {
                      const sevBlockers = allBlockers.filter((b) => b.severity === sev);
                      if (sevBlockers.length === 0) return null;
                      return (
                        <div key={sev}>
                          <p className={cn(
                            'text-[10px] font-bold uppercase tracking-wider px-1 mb-2',
                            sev === 'high' ? 'text-red-500' : sev === 'medium' ? 'text-orange-500' : 'text-yellow-500'
                          )}>
                            {sev} severity ({sevBlockers.length})
                          </p>
                          <div className="space-y-2">
                            {sevBlockers.map((b) => (
                              <BlockerCard
                                key={b.id}
                                blocker={b}
                                entry={b.entry}
                                sessionId={todaySession.id}
                                projectId={effectiveProject}
                                canResolve={isPM}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                {todaySession.status === 'completed' ? (
                  <SummaryPanel session={todaySession} />
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                    <BarChart3 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">Summary available after completion</p>
                    <p className="text-sm text-slate-400 mt-1">Complete the stand-up to auto-generate a summary.</p>
                    {isPM && (
                      <Button size="sm" className="mt-3" onClick={() => setCompleteOpen(true)}
                        icon={<CheckCheck className="h-3.5 w-3.5" />}>
                        Complete Stand-up
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {pastSessions.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No past sessions yet.</p>
                  </div>
                ) : (
                  pastSessions.map((s) => (
                    <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 text-sm">{getSessionDateLabel(s.date)}</span>
                            <Badge className="bg-slate-100 text-slate-600" size="sm">
                              {s.mode === 'live' ? 'Live' : 'Async'}
                            </Badge>
                            <Badge className="bg-green-100 text-green-700" size="sm">Completed</Badge>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(s.date)}</p>
                        </div>
                        {s.summary && (
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {s.summary.attendees}/{s.summary.total_members}
                            </span>
                            <span className="flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3 text-red-400" /> {s.summary.blockers_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-green-500" /> {s.summary.completed_tasks} done
                            </span>
                          </div>
                        )}
                      </div>
                      {s.summary && <SummaryPanel session={s} />}
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <CreateSessionModal
        open={createSessionOpen}
        onClose={() => setCreateSessionOpen(false)}
        projectOptions={projectOptions}
        defaultProjectId={effectiveProject}
      />

      {todaySession && (
        <>
          <SubmitEntryModal
            open={submitEntryOpen}
            onClose={() => setSubmitEntryOpen(false)}
            session={todaySession}
            userId={currentUser?.id ?? ''}
            projectId={effectiveProject}
            taskOptions={taskOptions}
            existingEntry={currentUserEntry}
          />

          <CompleteSessionModal
            open={completeOpen}
            onClose={() => setCompleteOpen(false)}
            session={todaySession}
            projectId={effectiveProject}
          />
        </>
      )}
    </div>
  );
};
