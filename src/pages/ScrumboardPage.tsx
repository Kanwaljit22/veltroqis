import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  pointerWithin,
  rectIntersection,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Plus, GripVertical, MessageSquare, Calendar, Search, BarChart2, X,
  ChevronDown, Play, CheckCircle2, Target, Zap, Clock, TrendingDown,
  GitPullRequest, TestTube, Layers, Filter, Send, Activity,
  AlertCircle, ArrowRight, Flag,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { MultiUserSelect } from '../components/ui/MultiUserSelect';
import { Avatar, AvatarGroup } from '../components/ui/Avatar';
import { EllipsisTooltip } from '../components/ui/EllipsisTooltip';
import { RichTextEditor } from '../components/ui/RichTextEditor';
import { Skeleton } from '../components/ui/Skeleton';
import { Tabs } from '../components/ui/Tabs';
import {
  PRIORITY_COLORS, PRIORITY_LABELS, PRIORITY_DOT_COLORS,
  LABEL_LABELS, LABEL_COLORS, STATUS_LABELS, STATUS_COLORS,
  formatDate, formatTimeAgo, cn,
} from '../lib/utils';
import { TaskLabelIcon } from '../lib/taskLabelIcons';
import { useTasks, useCreateTask, useUpdateTask } from '../hooks/useTasks';
import { useThemeStore } from '../store/themeStore';
import { useSprints, useBurndownData, useCreateSprint, useStartSprint, useCompleteSprint } from '../hooks/useSprints';
import { useProjects } from '../hooks/useProjects';
import { useUsers } from '../hooks/useUsers';
import { normalizeSprintGoalHtml, sanitizeRichText } from '../lib/sanitizeRichText';
import { useComments, useCreateComment } from '../hooks/useComments';
import { useEntityActivity } from '../hooks/useEntityActivity';
import { useAuthStore } from '../store/authStore';
import { canViewAllProjects, usePermissions } from '../lib/permissions';
import type { Task, TaskStatus, TaskPriority, TaskLabel, Sprint } from '../types';

// ─── Column Config ────────────────────────────────────────────────────────────

const SCRUM_COLUMNS: {
  id: TaskStatus;
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  { id: 'backlog',     label: 'Backlog',      color: 'text-dim dark:text-weak',  bg: 'bg-inset dark:bg-slate-800/60',   border: 'border-slate-300 dark:border-slate-600',  icon: <Layers className="h-3.5 w-3.5" />,       description: 'All pending items' },
  { id: 'todo',        label: 'To Do',        color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/50',  border: 'border-indigo-300 dark:border-indigo-700', icon: <Flag className="h-3.5 w-3.5" />,          description: 'Ready to start' },
  { id: 'in_progress', label: 'In Progress',  color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-950/50',      border: 'border-blue-300 dark:border-blue-700',    icon: <Play className="h-3.5 w-3.5" />,           description: 'Currently active' },
  { id: 'code_review', label: 'Code Review',  color: 'text-purple-600 dark:text-purple-400',bg: 'bg-purple-50 dark:bg-purple-950/50',  border: 'border-purple-300 dark:border-purple-700',icon: <GitPullRequest className="h-3.5 w-3.5" />, description: 'Awaiting review' },
  { id: 'testing',     label: 'Testing / QA', color: 'text-orange-600 dark:text-orange-400',bg: 'bg-orange-50 dark:bg-orange-950/50',  border: 'border-orange-300 dark:border-orange-700',icon: <TestTube className="h-3.5 w-3.5" />,       description: 'QA in progress' },
  { id: 'done',        label: 'Done',         color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-950/50',    border: 'border-green-300 dark:border-green-700',  icon: <CheckCircle2 className="h-3.5 w-3.5" />,   description: 'Completed' },
];

const ALL_TASK_LABELS = Object.keys(LABEL_LABELS) as TaskLabel[];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const SPRINT_STATUS_CONFIG = {
  planning: { label: 'Planning', color: 'bg-inset text-dim' },
  active:   { label: 'Active',   color: 'bg-green-100 text-green-700' },
  completed:{ label: 'Completed', color: 'bg-blue-100 text-blue-700' },
};

const boardCollisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  if (pointer.length > 0) return pointer;
  const rect = rectIntersection(args);
  if (rect.length > 0) return rect;
  return closestCorners(args);
};

// ─── Task Card ────────────────────────────────────────────────────────────────

const ScrumTaskCardInner: React.FC<{
  task: Task;
  onView: (t: Task) => void;
  userRole?: string;
  overlay?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}> = ({ task, onView, userRole, overlay, dragHandleProps }) => {
  const roleQuickAction = useMemo(() => {
    if (userRole === 'designer' && task.status === 'in_progress' && task.labels?.includes('design')) {
      return { label: 'Mark Dev Ready', nextStatus: 'code_review' as TaskStatus, icon: <GitPullRequest className="h-3 w-3" /> };
    }
    if (userRole === 'developer' && task.status === 'in_progress') {
      return { label: 'Send to Review', nextStatus: 'code_review' as TaskStatus, icon: <GitPullRequest className="h-3 w-3" /> };
    }
    if (userRole === 'qa' && task.status === 'testing') {
      return { label: 'Approve & Done', nextStatus: 'done' as TaskStatus, icon: <CheckCircle2 className="h-3 w-3" /> };
    }
    return null;
  }, [task.status, task.labels, userRole]);

  return (
    <div
      className={cn(
        'bg-surface rounded-xl border border-base p-3 shadow-sm cursor-pointer group hover:shadow-md transition-all',
        overlay && 'shadow-2xl rotate-1 scale-105 border-blue-300 cursor-grabbing'
      )}
      onClick={() => !overlay && onView(task)}
    >
      {/* Labels row */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className={cn(
                'inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded border',
                LABEL_COLORS[label]
              )}
            >
              <TaskLabelIcon label={label} className="h-2.5 w-2.5" strokeWidth={2.5} />
              {LABEL_LABELS[label]}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2">
        <div
          {...(dragHandleProps ?? {})}
          className="mt-0.5 p-0.5 rounded text-weak hover:text-dim cursor-grab active:cursor-grabbing shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className={cn('h-2 w-2 rounded-full shrink-0', PRIORITY_DOT_COLORS[task.priority])} />
            <Badge className={cn(PRIORITY_COLORS[task.priority], 'text-[10px] py-0')} size="sm">
              {PRIORITY_LABELS[task.priority]}
            </Badge>
            {task.story_points !== undefined && (
              <span className="ml-auto text-[10px] font-bold text-dim bg-inset px-1.5 py-0.5 rounded-full">
                {task.story_points} SP
              </span>
            )}
          </div>
          <p
            className={cn(
              'text-sm font-medium text-hi leading-snug line-clamp-2',
              task.description?.trim() ? 'mb-1' : 'mb-2.5'
            )}
          >
            {task.title}
          </p>
          {task.description?.trim() ? (
            <EllipsisTooltip
              text={task.description.trim()}
              disabled={!!overlay}
              className="text-xs text-dim leading-relaxed line-clamp-2 mb-2.5 wrap-break-word"
            />
          ) : null}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-weak">
              {!!task.comment_count && (
                <span className="flex items-center gap-0.5 text-xs">
                  <MessageSquare className="h-3 w-3" />{task.comment_count}
                </span>
              )}
              {task.due_date && (
                <span className="flex items-center gap-0.5 text-xs">
                  <Calendar className="h-3 w-3" />{formatDate(task.due_date)}
                </span>
              )}
            </div>
            {task.assignees && task.assignees.length > 0 && (
              <AvatarGroup users={task.assignees} max={3} size="xs" />
            )}
          </div>
        </div>
      </div>

      {/* Role-based quick action */}
      {roleQuickAction && !overlay && (
        <button
          className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] font-semibold py-1 rounded-lg bg-inset hover:bg-blue-50 dark:hover:bg-blue-950/40 text-dim hover:text-blue-600 border border-dashed border-base hover:border-blue-300 transition-all opacity-0 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); }}
          title={roleQuickAction.label}
        >
          {roleQuickAction.icon}
          {roleQuickAction.label}
          <ArrowRight className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
};

const SortableScrumTaskCard: React.FC<{
  task: Task;
  onView: (t: Task) => void;
  userRole?: string;
}> = ({ task, onView, userRole }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.38 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <ScrumTaskCardInner
        task={task}
        onView={onView}
        userRole={userRole}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

/** Column body: droppable wraps sortables so empty columns still receive `over.id` = column. */
const ScrumboardColumnDropZone: React.FC<{
  col: (typeof SCRUM_COLUMNS)[number];
  colTasks: Task[];
  onTaskView: (t: Task) => void;
  userRole?: string;
  onEmptyAddClick: () => void;
}> = ({ col, colTasks, onTaskView, userRole, onEmptyAddClick }) => {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col gap-2 flex-1 min-h-[120px] rounded-lg p-1 -mx-1 transition-colors',
        isOver && 'bg-blue-50/60 ring-2 ring-blue-300/50 ring-inset'
      )}
    >
      <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {colTasks.map((task) => (
          <SortableScrumTaskCard key={task.id} task={task} onView={onTaskView} userRole={userRole} />
        ))}
      </SortableContext>
      {colTasks.length === 0 && (
        <button
          type="button"
          className="flex-1 min-h-[80px] rounded-xl border-2 border-dashed border-base flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-base hover:bg-hover transition-colors"
          onClick={onEmptyAddClick}
        >
          <Plus className="h-4 w-4 text-weak" />
          <p className="text-[10px] text-weak font-medium">{col.description}</p>
        </button>
      )}
    </div>
  );
};

// ─── Burndown Chart ───────────────────────────────────────────────────────────

const BurndownPanel: React.FC<{ sprintId?: string }> = ({ sprintId }) => {
  const { data: burndown = [] } = useBurndownData(sprintId);
  const { colorMode } = useThemeStore();
  const isDark = colorMode === 'dark';
  const grid    = isDark ? '#1e293b' : '#f1f5f9';
  const tick    = isDark ? '#64748b' : '#94a3b8';
  const tipBg   = isDark ? '#0f172a' : '#ffffff';
  const tipBdr  = isDark ? '#1e293b' : '#e2e8f0';
  const tipClr  = isDark ? '#f1f5f9' : '#0f172a';
  return (
    <div className="bg-surface rounded-xl border border-base shadow-sm p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown className="h-4 w-4 text-blue-500" />
        <h3 className="font-semibold text-hi text-sm">Sprint Burndown</h3>
        <span className="text-xs text-weak ml-auto">Story Points Remaining</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={burndown} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: tick }} interval={1} />
          <YAxis tick={{ fontSize: 10, fill: tick }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${tipBdr}`, background: tipBg, color: tipClr }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: tick }} />
          <Line type="monotone" dataKey="ideal"  name="Ideal"  stroke={tick}      strokeDasharray="5 5" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="actual" name="Actual" stroke="#3b82f6"   strokeWidth={2}       dot={{ r: 3, fill: '#3b82f6' }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Task Detail Modal ────────────────────────────────────────────────────────

const TaskDetailModal: React.FC<{
  task: Task | null;
  sprint?: Sprint;
  onClose: () => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
}> = ({ task, sprint, onClose, onStatusChange }) => {
  const { user: currentUser } = useAuthStore();
  const createComment = useCreateComment();
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: taskComments = [] } = useComments('task', task?.id ?? '');
  const { data: taskActivity = [] } = useEntityActivity('task', task?.id ?? '', 5);

  if (!task) return null;

  const statusOptions = SCRUM_COLUMNS.map((c) => ({ value: c.id, label: c.label }));

  const submitComment = async () => {
    if (!task?.id || !currentUser) return;
    const trimmed = newComment.trim();
    if (!trimmed) return;
    await createComment.mutateAsync({
      entity_type: 'task',
      entity_id: task.id,
      author_id: currentUser.id,
      content: trimmed,
    });
    setNewComment('');
  };

  return (
    <Modal open={!!task} onClose={onClose} title="" size="xl">
      <div className="-mt-2">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {task.labels?.map((l) => (
                <span
                  key={l}
                  className={cn(
                    'inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                    LABEL_COLORS[l]
                  )}
                >
                  <TaskLabelIcon label={l} className="h-2.5 w-2.5" strokeWidth={2.5} />
                  {LABEL_LABELS[l]}
                </span>
              ))}
              <Badge className={PRIORITY_COLORS[task.priority]} size="sm">{PRIORITY_LABELS[task.priority]}</Badge>
              <Badge className={STATUS_COLORS[task.status]} size="sm">{STATUS_LABELS[task.status]}</Badge>
              {task.story_points !== undefined && (
                <span className="text-[10px] font-bold text-dim bg-inset px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <Zap className="h-2.5 w-2.5" /> {task.story_points} SP
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-hi leading-tight">{task.title}</h2>
          </div>
        </div>

        <Tabs
          tabs={[
            { id: 'overview',  label: 'Overview' },
            { id: 'comments',  label: 'Comments', count: taskComments.length || undefined },
            { id: 'activity',  label: 'Activity' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="underline"
        />

        <div className="mt-4">
        {activeTab === 'overview' && (
            <div className="space-y-4">
              {task.description && (
                <div>
                  <p className="text-xs font-medium text-weak mb-1">Description</p>
                  <p className="text-sm text-body leading-relaxed bg-inset rounded-lg p-3">{task.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-weak mb-1.5">Status</p>
                  <select
                    value={task.status}
                    onChange={(e) => onStatusChange(task, e.target.value as TaskStatus)}
                    className="w-full text-sm border border-base rounded-lg px-2.5 py-1.5 bg-surface text-hi focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-medium text-weak mb-1.5">Priority</p>
                  <Badge className={cn(PRIORITY_COLORS[task.priority], 'text-sm py-1 px-2.5')}>
                    {PRIORITY_LABELS[task.priority]}
                  </Badge>
                </div>
                {task.due_date && (
                  <div>
                    <p className="text-xs font-medium text-weak mb-1.5">Due Date</p>
                    <div className="flex items-center gap-1.5 text-sm text-body">
                      <Calendar className="h-3.5 w-3.5 text-weak" />
                      {formatDate(task.due_date)}
                    </div>
                  </div>
                )}
                {task.story_points !== undefined && (
                  <div>
                    <p className="text-xs font-medium text-weak mb-1.5">Story Points</p>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-body">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      {task.story_points} points
                    </div>
                  </div>
                )}
              </div>
              {task.assignees && task.assignees.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-weak mb-2">Assignees</p>
                  <div className="flex flex-wrap gap-2">
                    {task.assignees.map((u) => (
                      <div key={u.id} className="flex items-center gap-2 bg-inset rounded-full pl-1 pr-3 py-1">
                        <Avatar src={u.avatar_url} name={u.full_name} size="xs" />
                        <span className="text-xs font-medium text-body">{u.full_name}</span>
                        <span className="text-[10px] text-weak capitalize">{u.role.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {task.reporter && (
                <div>
                  <p className="text-xs font-medium text-weak mb-1.5">Reporter</p>
                  <div className="flex items-center gap-2">
                    <Avatar src={task.reporter.avatar_url} name={task.reporter.full_name} size="xs" />
                    <span className="text-sm text-body">{task.reporter.full_name}</span>
                  </div>
                </div>
              )}
              {sprint && (
                <div>
                  <p className="text-xs font-medium text-weak mb-1.5">Sprint</p>
                  <div className="flex items-center gap-1.5 text-sm text-body">
                    <Target className="h-3.5 w-3.5 text-weak" />
                    {sprint.name}
                    <Badge className={SPRINT_STATUS_CONFIG[sprint.status].color} size="sm">
                      {SPRINT_STATUS_CONFIG[sprint.status].label}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-3">
            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
              {taskComments.length === 0 ? (
                <div className="text-center py-5 text-weak">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No comments yet. Start the conversation!</p>
                </div>
              ) : (
                taskComments.map((c) => (
                  <div key={c.id} className={cn('flex gap-2.5', c.parent_id && 'ml-8')}>
                    <Avatar src={c.author?.avatar_url} name={c.author?.full_name ?? ''} size="sm" />
                    <div className="flex-1 bg-inset rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-hi">{c.author?.full_name}</span>
                        <span className="text-[10px] text-weak">{formatTimeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-body leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2 pt-3 border-t border-subtle">
              {currentUser && <Avatar src={currentUser.avatar_url} name={currentUser.full_name} size="sm" />}
              <div className="flex-1 flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 text-sm border border-base rounded-lg px-3 py-2 bg-surface text-hi placeholder:text-weak focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitComment();
                    }
                  }}
                />
                <button
                  className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                  onClick={submitComment}
                  disabled={!newComment.trim() || createComment.isPending}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {taskActivity.length === 0 ? (
                <div className="text-center py-5 text-weak">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No activity recorded yet.</p>
                </div>
              ) : (
                taskActivity.map((log) => (
                  <div key={log.id} className="flex gap-2.5 text-sm">
                    <Avatar src={log.user?.avatar_url} name={log.user?.full_name ?? ''} size="xs" />
                    <div>
                      <span className="font-medium text-body">{log.user?.full_name}</span>
                      <span className="text-dim"> {log.action}</span>
                      <p className="text-[10px] text-weak mt-0.5">{formatTimeAgo(log.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
              <div className="flex gap-2.5 text-sm">
                <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
                  <ArrowRight className="h-3 w-3 text-blue-600" />
                </div>
                <div>
                  <span className="text-dim">Status changed to </span>
                  <span className="font-medium text-body">{STATUS_LABELS[task.status]}</span>
                  <p className="text-[10px] text-weak mt-0.5">Today</p>
                </div>
              </div>
              <div className="flex gap-2.5 text-sm">
                <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center shrink-0">
                  <Plus className="h-3 w-3 text-green-600" />
                </div>
                <div>
                  <span className="text-dim">Task created by </span>
                  <span className="font-medium text-body">{task.reporter?.full_name ?? 'Unknown'}</span>
                  <p className="text-[10px] text-weak mt-0.5">{formatDate(task.created_at)}</p>
                </div>
              </div>
            </div>
        )}
        </div>
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </ModalFooter>
    </Modal>
  );
};

// ─── Sprint Modal ─────────────────────────────────────────────────────────────

const sprintSchema = z.object({
  name:       z.string().min(2, 'Sprint name required'),
  goal:       z.string().max(200_000, 'Sprint goal is too long').optional(),
  start_date: z.string().min(1, 'Start date required'),
  end_date:   z.string().min(1, 'End date required'),
  project_id: z.string().min(1, 'Project required'),
});
type SprintForm = z.infer<typeof sprintSchema>;

const SprintModal: React.FC<{
  open: boolean;
  onClose: () => void;
  projectOptions: { value: string; label: string }[];
  defaultProjectId?: string;
}> = ({ open, onClose, projectOptions, defaultProjectId }) => {
  const createSprint = useCreateSprint();
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<SprintForm>({
    resolver: zodResolver(sprintSchema),
    defaultValues: { project_id: defaultProjectId, goal: '' },
  });

  const watchedProjectId = useWatch({ control, name: 'project_id' }) ?? '';

  const onSubmit = async (data: SprintForm) => {
    await createSprint.mutateAsync({
      project_id: data.project_id,
      name: data.name,
      goal: normalizeSprintGoalHtml(data.goal),
      start_date: data.start_date,
      end_date: data.end_date,
    });
    onClose();
    reset();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Sprint" description="Plan a new sprint for your team" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="Sprint Name"
              placeholder="e.g. Sprint 7 — Feature Freeze"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>
          <Select
            label="Project"
            options={projectOptions}
            placeholder="Select project"
            error={errors.project_id?.message}
            {...register('project_id')}
          />
          <div />
          <Input label="Start Date" type="date" error={errors.start_date?.message} {...register('start_date')} />
          <Input label="End Date"   type="date" error={errors.end_date?.message}   {...register('end_date')} />
          <div className="col-span-2">
            <Controller
              name="goal"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  label="Sprint Goal"
                  id="sprint-goal"
                  hint="Select a project before attaching images. Stored HTML is sanitized on save."
                  placeholder="What does the team aim to achieve this sprint?"
                  value={field.value ?? ''}
                  onChangeHtml={field.onChange}
                  projectId={watchedProjectId}
                  error={errors.goal?.message}
                />
              )}
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" type="button" onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button type="submit" loading={createSprint.isPending} icon={<Target className="h-4 w-4" />}>
            Create Sprint
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

// ─── Create Task Modal ────────────────────────────────────────────────────────

const taskSchema = z.object({
  title:        z.string().min(1, 'Title required'),
  description:  z.string().optional(),
  priority:     z.string().min(1),
  due_date:     z.string().optional(),
  project_id:   z.string().min(1, 'Project required'),
  sprint_id:    z.string().optional(),
  story_points: z.string().optional(),
});
type TaskForm = z.infer<typeof taskSchema>;
type CreateTaskModalPayload = TaskForm & { status: TaskStatus; labels: TaskLabel[]; assignee_ids: string[] };

const CreateTaskModal: React.FC<{
  open: boolean;
  onClose: () => void;
  defaultStatus: TaskStatus;
  projectOptions: { value: string; label: string }[];
  userOptions:    { value: string; label: string }[];
  sprintOptions:  { value: string; label: string }[];
  defaultProjectId?: string;
  defaultSprintId?: string;
  onCreated: (input: CreateTaskModalPayload) => Promise<void>;
  isCreating: boolean;
}> = ({
  open, onClose, defaultStatus, projectOptions, userOptions, sprintOptions,
  defaultProjectId, defaultSprintId, onCreated, isCreating,
}) => {
  const [selectedLabels, setSelectedLabels] = useState<TaskLabel[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const assigneeOptions = userOptions.filter((o) => o.value !== '');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: 'medium', project_id: defaultProjectId, sprint_id: defaultSprintId },
  });

  const toggleLabel = (l: TaskLabel) =>
    setSelectedLabels((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]);

  const onSubmit = async (data: TaskForm) => {
    await onCreated({
      ...data,
      status: defaultStatus,
      labels: selectedLabels,
      assignee_ids: assigneeIds,
    });
    onClose();
    reset();
    setSelectedLabels([]);
    setAssigneeIds([]);
  };

  const colLabel = SCRUM_COLUMNS.find((c) => c.id === defaultStatus)?.label ?? defaultStatus;

  return (
    <Modal open={open} onClose={onClose} title="Create Task" description={`Adding to → ${colLabel}`} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Task Title" placeholder="Describe the task clearly..." error={errors.title?.message} {...register('title')} />
        <Textarea label="Description" placeholder="Add context, acceptance criteria, or links..." rows={3} {...register('description')} />

        {/* Labels */}
        <div>
          <p className="text-xs font-medium text-body mb-2">Labels</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_TASK_LABELS.map((taskLabel) => (
              <button
                key={taskLabel}
                type="button"
                onClick={() => toggleLabel(taskLabel)}
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all',
                  selectedLabels.includes(taskLabel)
                    ? cn(LABEL_COLORS[taskLabel], 'ring-2 ring-offset-1 ring-current')
                    : 'bg-inset text-dim border-base hover:bg-hover'
                )}
              >
                <TaskLabelIcon label={taskLabel} className="h-3.5 w-3.5" strokeWidth={2} />
                {LABEL_LABELS[taskLabel]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select label="Project"  options={projectOptions} placeholder="Select project"  error={errors.project_id?.message} {...register('project_id')} />
          <Select label="Sprint"   options={[{ value: '', label: 'No Sprint (Backlog)' }, ...sprintOptions]} {...register('sprint_id')} />
          <Select label="Priority" options={PRIORITY_OPTIONS} error={errors.priority?.message} {...register('priority')} />
          <Input  label="Story Points" type="number" placeholder="e.g. 5" {...register('story_points')} />
          <div className="col-span-2">
            <MultiUserSelect
              label="Assignees"
              options={assigneeOptions}
              value={assigneeIds}
              onChange={setAssigneeIds}
              placeholder="Unassigned"
            />
          </div>
          <Input label="Due Date" type="date" {...register('due_date')} />
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => { onClose(); reset(); setSelectedLabels([]); setAssigneeIds([]); }}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isCreating} icon={<Plus className="h-4 w-4" />}>
            Create Task
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const ScrumboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { can } = usePermissions();
  const isAdmin = canViewAllProjects(currentUser?.role);

  const { data: projects = [] } = useProjects();
  const { data: users = [] } = useUsers();

  const [projectFilter, setProjectFilter]   = useState('');
  const [sprintFilter,  setSprintFilter]    = useState('');
  const [search,        setSearch]          = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [labelFilter,    setLabelFilter]    = useState('');
  const [myTasksOnly,    setMyTasksOnly]    = useState(false);
  const [showBurndown,   setShowBurndown]   = useState(false);
  const [showFilters,    setShowFilters]    = useState(false);
  const [activeTask,     setActiveTask]     = useState<Task | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [createColumn,  setCreateColumn]   = useState<TaskStatus>('backlog');

  const visibleProjectIds = useMemo(() => new Set(projects.map((project) => project.id)), [projects]);
  const selectedProject = projectFilter && visibleProjectIds.has(projectFilter) ? projectFilter : '';
  const effectiveProject = selectedProject || projects[0]?.id || '';
  const { data: allTasks = [], isLoading } = useTasks(effectiveProject || undefined);
  const { data: sprints = [] } = useSprints(effectiveProject || undefined);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const startSprint = useStartSprint();
  const completeSprint = useCompleteSprint();

  useEffect(() => {
    if (projectFilter && !visibleProjectIds.has(projectFilter)) {
      setProjectFilter('');
    }
  }, [projectFilter, visibleProjectIds]);

  useEffect(() => {
    if (sprintFilter && !sprints.some((sprint) => sprint.id === sprintFilter)) {
      setSprintFilter('');
    }
  }, [sprintFilter, sprints]);

  const activeSprint = sprints.find((s) => s.status === 'active') ?? sprints[0];
  const displaySprint = sprintFilter ? sprints.find((s) => s.id === sprintFilter) : activeSprint;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Filter logic
  const filteredTasks = useMemo(() => {
    let tasks = allTasks;
    if (search)         tasks = tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
    if (assigneeFilter) tasks = tasks.filter((t) => t.assignee_ids.includes(assigneeFilter));
    if (priorityFilter) tasks = tasks.filter((t) => t.priority === priorityFilter);
    if (labelFilter)    tasks = tasks.filter((t) => t.labels?.includes(labelFilter as TaskLabel));
    if (myTasksOnly && currentUser) tasks = tasks.filter((t) => t.assignee_ids.includes(currentUser.id));
    return tasks;
  }, [allTasks, search, assigneeFilter, priorityFilter, labelFilter, myTasksOnly, currentUser]);

  const getColumnTasks = (status: TaskStatus) => filteredTasks.filter((t) => t.status === status);

  const totalSP = filteredTasks.reduce((sum, t) => sum + (t.story_points ?? 0), 0);
  const doneSP  = filteredTasks.filter((t) => t.status === 'done').reduce((sum, t) => sum + (t.story_points ?? 0), 0);
  const progressPct = totalSP > 0 ? Math.round((doneSP / totalSP) * 100) : 0;

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const task = allTasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || !effectiveProject) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeTaskData = allTasks.find((t) => t.id === activeId);
    if (!activeTaskData) return;

    let targetStatus: TaskStatus | undefined;
    if (SCRUM_COLUMNS.some((c) => c.id === overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      const overTask = allTasks.find((t) => t.id === overId);
      if (overTask) targetStatus = overTask.status;
    }

    if (!targetStatus || activeTaskData.status === targetStatus) return;

    try {
      await updateTask.mutateAsync({
        id: activeId,
        projectId: effectiveProject,
        updates: { status: targetStatus },
      });
    } catch {
      /* toast handled in useUpdateTask.onError */
    }
  };

  const handleCreateTask = async (data: CreateTaskModalPayload) => {
    const { user: cu } = useAuthStore.getState();
    await createTask.mutateAsync({
      project_id:   data.project_id,
      title:        data.title,
      description:  data.description,
      status:       data.status,
      priority:     data.priority as TaskPriority,
      assignee_ids: data.assignee_ids,
      reporter_id:  cu?.id ?? '',
      due_date:     data.due_date,
    });
  };

  const openCreate = (status: TaskStatus) => { setCreateColumn(status); setCreateModalOpen(true); };

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const userOptions    = [{ value: '', label: 'Unassigned' }, ...users.map((u) => ({ value: u.id, label: u.full_name }))];
  const sprintOptions  = sprints.map((s) => ({ value: s.id, label: s.name }));
  const priorityFilterOptions = [{ value: '', label: 'All Priorities' }, ...PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label }))];
  const labelFilterOptions    = [{ value: '', label: 'All Labels' }, ...ALL_TASK_LABELS.map((v) => ({ value: v, label: LABEL_LABELS[v] }))];

  const hasActiveFilters = !!(search || assigneeFilter || priorityFilter || labelFilter || myTasksOnly);

  return (
    <div className="space-y-4 h-full">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-hi">Scrumboard</h1>
          <p className="text-sm text-dim mt-0.5">Agile board · Drag cards to update status</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={<BarChart2 className="h-4 w-4" />}
            onClick={() => setShowBurndown((v) => !v)}
            className={showBurndown ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}
          >
            {showBurndown ? 'Hide' : 'Burndown'}
          </Button>
          {can('assign_tasks') && (
            <Button
              variant="outline"
              size="sm"
              icon={<Target className="h-4 w-4" />}
              onClick={() => setSprintModalOpen(true)}
              disabled={!effectiveProject}
            >
              New Sprint
            </Button>
          )}
          <Button
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => openCreate('backlog')}
            disabled={!effectiveProject}
          >
            Add Task
          </Button>
        </div>
      </div>

      {currentUser && (
        <div className="flex items-center gap-2 text-xs text-dim bg-inset px-3 py-2 rounded-lg border border-base">
          <AlertCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          {isAdmin
            ? `Admin access: viewing all ${projects.length} project${projects.length === 1 ? '' : 's'} in the scrumboard.`
            : `Restricted access: you can only open scrumboards for projects where you're the lead or an assigned member (${projects.length} available).`}
        </div>
      )}

      {!effectiveProject && (
        <div className="bg-surface rounded-xl border border-base shadow-sm p-10 text-center">
          <Target className="h-10 w-10 text-weak mx-auto mb-3" />
          <p className="text-sm font-medium text-body">No accessible projects</p>
          <p className="text-xs text-dim mt-1">
            {isAdmin
              ? 'Create a project to start planning work on the scrumboard.'
              : 'You will see projects here after you are added as a lead or project member.'}
          </p>
        </div>
      )}

      {/* ── Sprint Header ────────────────────────────────────────────── */}
      {effectiveProject && displaySprint && (
        <div className="bg-surface rounded-xl border border-base shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Sprint selector */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-9 w-9 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <Target className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <select
                      value={sprintFilter || displaySprint.id}
                      onChange={(e) => setSprintFilter(e.target.value)}
                      className="appearance-none text-sm font-bold text-hi bg-transparent border-0 pr-5 cursor-pointer focus:outline-none"
                    >
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-weak pointer-events-none" />
                  </div>
                  <Badge className={SPRINT_STATUS_CONFIG[displaySprint.status].color} size="sm">
                    {SPRINT_STATUS_CONFIG[displaySprint.status].label}
                  </Badge>
                </div>
                {displaySprint.goal && (
                  <div
                    className="text-xs text-dim mt-1 max-w-xl line-clamp-4 overflow-hidden [&_p]:m-0 [&_ul]:my-0 [&_ol]:my-0 [&_img]:max-h-12 [&_img]:rounded [&_img]:inline-block [&_img]:align-middle [&_img]:mr-1"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichText(displaySprint.goal) }}
                  />
                )}
              </div>
            </div>

            {/* Sprint stats */}
            <div className="flex items-center gap-4 text-xs text-dim flex-wrap">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(displaySprint.start_date)} – {formatDate(displaySprint.end_date)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-medium">{doneSP}/{totalSP} SP</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span>{getColumnTasks('done').length} done</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-orange-400" />
                <span>{filteredTasks.filter((t) => t.status !== 'done').length} remaining</span>
              </div>
            </div>

            {/* Sprint actions — admin / project_lead only */}
            {can('assign_tasks') && (
              <div className="flex items-center gap-2">
                {displaySprint.status === 'planning' && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Play className="h-3.5 w-3.5" />}
                    onClick={() => startSprint.mutate({
                      id: displaySprint.id,
                      projectId: displaySprint.project_id,
                      name: displaySprint.name,
                    })}
                    loading={startSprint.isPending}
                  >
                    Start Sprint
                  </Button>
                )}
                {displaySprint.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    onClick={() => completeSprint.mutate({
                      id: displaySprint.id,
                      projectId: displaySprint.project_id,
                      name: displaySprint.name,
                    })}
                    loading={completeSprint.isPending}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    Complete Sprint
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-dim mb-1">
              <span>Sprint Progress</span>
              <span className="font-medium">{progressPct}%</span>
            </div>
            <div className="h-2 bg-inset rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Burndown Chart ───────────────────────────────────────────── */}
      {showBurndown && (
        <BurndownPanel sprintId={displaySprint?.id} />
      )}

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[180px] max-w-xs">
            <Input
              placeholder="Search tasks..."
              leftIcon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-44">
            <Select
              options={[{ value: '', label: isAdmin ? 'All Projects' : 'My Projects' }, ...projectOptions]}
              value={selectedProject}
              onChange={(e) => setProjectFilter(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
              showFilters || hasActiveFilters
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 text-blue-700 dark:text-blue-400'
                : 'bg-surface border-base text-dim hover:bg-hover'
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="h-4 w-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">!</span>
            )}
          </button>
          <button
            onClick={() => setMyTasksOnly((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
              myTasksOnly
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 text-indigo-700 dark:text-indigo-400'
                : 'bg-surface border-base text-dim hover:bg-hover'
            )}
          >
            My Tasks
          </button>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(''); setAssigneeFilter(''); setPriorityFilter(''); setLabelFilter(''); setMyTasksOnly(false); }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-transparent transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="flex gap-3 flex-wrap p-3 bg-inset rounded-xl border border-base">
            <div className="w-44">
              <Select
                options={[{ value: '', label: 'All Assignees' }, ...users.map((u) => ({ value: u.id, label: u.full_name }))]}
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                options={priorityFilterOptions}
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              />
            </div>
            <div className="w-44">
              <Select
                options={labelFilterOptions}
                value={labelFilter}
                onChange={(e) => setLabelFilter(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Role Hint Banner ─────────────────────────────────────────── */}
      {currentUser && effectiveProject && (
        <div className="flex items-center gap-2 text-xs text-dim bg-inset px-3 py-2 rounded-lg border border-base">
          <AlertCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          {currentUser.role === 'qa' && 'QA: Move tasks in Testing column to Done when they pass, or back to In Progress if bugs found.'}
          {currentUser.role === 'developer' && 'Developer: Move your In Progress tasks to Code Review when ready, then to Testing.'}
          {currentUser.role === 'designer' && 'Designer: Upload Figma links in task description. Move design tasks to Code Review when dev-ready.'}
          {(currentUser.role === 'admin' || currentUser.role === 'project_lead') && 'PM/Lead: Prioritize backlog, manage sprints, and track progress using the Burndown chart above.'}
          {currentUser.role !== 'qa' && currentUser.role !== 'developer' && currentUser.role !== 'designer' && currentUser.role !== 'admin' && currentUser.role !== 'project_lead' && 'Drag cards between columns to update status. Click any card for full details.'}
        </div>
      )}

      {/* ── Kanban Board ─────────────────────────────────────────────── */}
      {effectiveProject && isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {SCRUM_COLUMNS.map((col) => (
            <div key={col.id} className="min-w-[240px] space-y-2">
              <Skeleton className="h-10 rounded-xl" />
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      ) : effectiveProject ? (
        <DndContext
          sensors={sensors}
          collisionDetection={boardCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4 min-h-[480px]">
            {SCRUM_COLUMNS.map((col) => {
              const colTasks = getColumnTasks(col.id);
              return (
                <div key={col.id} id={col.id} className="flex flex-col min-w-[230px] max-w-[260px] shrink-0">
                  {/* Column header */}
                  <div className={cn('flex items-center px-3 py-2 rounded-xl mb-2', col.bg)}>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('shrink-0', col.color)}>{col.icon}</span>
                      <span className={cn('text-xs font-bold', col.color)}>{col.label}</span>
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface/70 dark:bg-black/30', col.color)}>
                        {colTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Story points summary */}
                  {colTasks.some((t) => t.story_points) && (
                    <div className={cn('text-[10px] font-medium px-2 mb-1.5', col.color)}>
                      {colTasks.reduce((s, t) => s + (t.story_points ?? 0), 0)} SP
                    </div>
                  )}

                  {/* Tasks (droppable per column so empty columns accept drops) */}
                  <ScrumboardColumnDropZone
                    col={col}
                    colTasks={colTasks}
                    onTaskView={(selectedTask) => navigate(`/tasks/${selectedTask.id}?from=scrumboard`)}
                    userRole={currentUser?.role}
                    onEmptyAddClick={() => openCreate(col.id)}
                  />
                </div>
              );
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <ScrumTaskCardInner task={activeTask} onView={() => {}} overlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : null}

      {/* ── Create Task Modal ────────────────────────────────────────── */}
      <CreateTaskModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        defaultStatus={createColumn}
        projectOptions={projectOptions}
        userOptions={userOptions}
        sprintOptions={sprintOptions}
        defaultProjectId={effectiveProject}
        defaultSprintId={activeSprint?.id}
        onCreated={handleCreateTask}
        isCreating={createTask.isPending}
      />

      {/* ── Sprint Modal ─────────────────────────────────────────────── */}
      <SprintModal
        open={sprintModalOpen}
        onClose={() => setSprintModalOpen(false)}
        projectOptions={projectOptions}
        defaultProjectId={effectiveProject}
      />
    </div>
  );
};
