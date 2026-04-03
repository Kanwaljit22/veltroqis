import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Clock3,
  Edit3,
  Flag,
  FolderKanban,
  MessageSquare,
  Plus,
  Save,
  Send,
  Tag,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { useTask, useUpdateTask } from '../hooks/useTasks';
import { useProject } from '../hooks/useProjects';
import { useUsers } from '../hooks/useUsers';
import { useComments, useCreateComment } from '../hooks/useComments';
import { useEntityActivity } from '../hooks/useEntityActivity';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../lib/permissions';
import { MultiUserSelect } from '../components/ui/MultiUserSelect';
import {
  LABEL_COLORS,
  LABEL_LABELS,
  PRIORITY_COLORS,
  PRIORITY_DOT_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  cn,
  formatDate,
  formatTimeAgo,
} from '../lib/utils';
import { TaskLabelIcon } from '../lib/taskLabelIcons';
import type { TaskLabel, TaskPriority, TaskStatus } from '../types';

export const TaskDetailsPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { can } = usePermissions();
  const { data: users = [] } = useUsers();
  const updateTask = useUpdateTask();
  const createComment = useCreateComment();
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: task, isLoading } = useTask(id);
  const { data: project, isLoading: projectLoading } = useProject(task?.project_id ?? '');

  const fromTasksBoard = searchParams.get('from') === 'tasks';
  const boardCrumb = fromTasksBoard
    ? { to: '/tasks' as const, label: 'Task Board' }
    : { to: '/scrumboard' as const, label: 'Scrumboard' };

  const { data: comments = [] } = useComments('task', id);
  const { data: activity = [] } = useEntityActivity('task', id, 8);

  const handleStatusChange = async (status: TaskStatus) => {
    if (!task || task.status === status) return;
    await updateTask.mutateAsync({
      id: task.id,
      projectId: task.project_id,
      updates: { status },
    });
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    if (!task || task.priority === priority) return;
    await updateTask.mutateAsync({
      id: task.id,
      projectId: task.project_id,
      updates: { priority },
    });
  };

  const handleDueDateChange = async (date: string) => {
    if (!task) return;
    await updateTask.mutateAsync({
      id: task.id,
      projectId: task.project_id,
      updates: { due_date: date || null },
    });
  };

  const handleLabelToggle = async (label: TaskLabel) => {
    if (!task) return;
    const current = task.labels ?? [];
    const next = current.includes(label)
      ? current.filter((l) => l !== label)
      : [...current, label];
    await updateTask.mutateAsync({
      id: task.id,
      projectId: task.project_id,
      updates: { labels: next },
    });
  };

  const startEditing = () => {
    if (!task) return;
    setDraftTitle(task.title);
    setDraftDescription(task.description ?? '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraftTitle(task?.title ?? '');
    setDraftDescription(task?.description ?? '');
  };

  const saveTaskDetails = async () => {
    if (!task) return;
    const trimmedTitle = draftTitle.trim();
    if (!trimmedTitle) return;

    await updateTask.mutateAsync({
      id: task.id,
      projectId: task.project_id,
      updates: {
        title: trimmedTitle,
        description: draftDescription.trim() || undefined,
      },
    });
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-56 rounded-md" />
        <div className="bg-surface rounded-2xl border border-base shadow-sm p-6">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8">
            <div className="space-y-6">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-56 w-full rounded-2xl" />
              <Skeleton className="h-56 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-128 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="bg-surface rounded-2xl border border-base shadow-sm p-8 text-center">
        <h1 className="text-xl font-bold text-hi mb-2">Task not found</h1>
        <p className="text-sm text-dim mb-5">The task may have been removed or you may not have access to it.</p>
        <Button variant="outline" onClick={() => navigate('/scrumboard')}>
          Back to Scrumboard
        </Button>
      </div>
    );
  }

  const submitComment = async () => {
    if (!currentUser) return;
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
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0 text-sm">
          <li className="flex min-w-0 items-center gap-2">
            <Link
              to={boardCrumb.to}
              className="shrink-0 font-medium text-blue-600 transition-colors hover:text-blue-800"
            >
              {boardCrumb.label}
            </Link>
            <ChevronRight className="h-4 w-4 shrink-0 text-weak" aria-hidden />
          </li>
          <li className="flex min-w-0 max-w-full items-center gap-2">
            <Link
              to={`/projects/${task.project_id}`}
              title={project?.name ?? undefined}
              className="min-w-0 max-w-[min(12rem,42vw)] truncate font-medium text-blue-600 transition-colors hover:text-blue-800 sm:max-w-xs"
            >
              {projectLoading ? 'Loading…' : project?.name ?? 'Project'}
            </Link>
            <ChevronRight className="h-4 w-4 shrink-0 text-weak" aria-hidden />
          </li>
          <li className="min-w-0 max-w-full flex-1 sm:flex-initial">
            <span
              className="block truncate font-semibold text-hi sm:max-w-xl"
              aria-current="page"
            >
              {task.title}
            </span>
          </li>
        </ol>
      </nav>

      <div className="bg-surface rounded-2xl border border-base shadow-sm p-6">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
          <div className="space-y-8 min-w-0">
            <section>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {task.labels?.map((label) => (
                      <span
                        key={label}
                        className={cn(
                          'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border',
                          LABEL_COLORS[label]
                        )}
                      >
                        <TaskLabelIcon label={label} className="h-3 w-3 opacity-90" strokeWidth={2.25} />
                        {LABEL_LABELS[label]}
                      </span>
                    ))}
                    <Badge className={PRIORITY_COLORS[task.priority]} size="sm">
                      {PRIORITY_LABELS[task.priority]}
                    </Badge>
                    <Badge className={STATUS_COLORS[task.status]} size="sm">
                      {STATUS_LABELS[task.status]}
                    </Badge>
                    {task.story_points !== undefined && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-dim bg-inset px-2 py-1 rounded-full">
                        <Zap className="h-3 w-3 text-amber-500" />
                        {task.story_points} SP
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <Input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        placeholder="Task title"
                        className="h-12 text-2xl font-bold"
                      />
                      <div>
                        <p className="text-sm font-semibold text-weak uppercase tracking-wider mb-3">Description</p>
                        <Textarea
                          value={draftDescription}
                          onChange={(event) => setDraftDescription(event.target.value)}
                          placeholder="Add task description..."
                          rows={5}
                          className="text-base leading-7"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <h1 className="text-3xl font-bold text-hi leading-tight">{task.title}</h1>
                      <div>
                        <p className="text-sm font-semibold text-weak uppercase tracking-wider mb-3">Description</p>
                        <div className="bg-inset rounded-xl px-4 py-4">
                          <p className="text-base leading-7 text-body">
                            {task.description || 'No description provided yet.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isEditing ? (
                    <>
                      <Button variant="outline" size="sm" icon={<X className="h-4 w-4" />} onClick={cancelEditing}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        icon={<Save className="h-4 w-4" />}
                        onClick={saveTaskDetails}
                        loading={updateTask.isPending}
                        disabled={!draftTitle.trim()}
                      >
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" icon={<Edit3 className="h-4 w-4" />} onClick={startEditing}>
                      Edit
                    </Button>
                  )}

                  <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-lg hover:bg-hover transition-colors"
                    title="Go back"
                  >
                    <ArrowLeft className="h-5 w-5 text-dim" />
                  </button>
                </div>
              </div>
            </section>

            <section className="border-t border-subtle pt-6">
              <div className="flex items-center gap-2 mb-5">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <h2 className="text-base font-semibold text-hi">Comments</h2>
                <span className="text-xs font-medium text-weak">{comments.length}</span>
              </div>

              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-sm text-weak bg-inset rounded-xl px-4 py-6 text-center">
                    No comments yet.
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className={cn('flex gap-3', comment.parent_id && 'ml-8')}>
                      <Avatar src={comment.author?.avatar_url} name={comment.author?.full_name ?? ''} size="sm" />
                      <div className="flex-1 bg-inset rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-semibold text-hi">{comment.author?.full_name}</span>
                          <span className="text-xs text-weak">{formatTimeAgo(comment.created_at)}</span>
                        </div>
                        <p className="text-sm text-body leading-6">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-3 pt-5 mt-5 border-t border-subtle">
                {currentUser && <Avatar src={currentUser.avatar_url} name={currentUser.full_name} size="sm" />}
                <div className="flex-1 flex gap-2">
                  <input
                    value={newComment}
                    onChange={(event) => setNewComment(event.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 text-sm border border-base rounded-xl px-3 py-2.5 bg-surface text-hi placeholder:text-weak focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitComment();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={submitComment}
                    icon={<Send className="h-4 w-4" />}
                    loading={createComment.isPending}
                    disabled={!newComment.trim()}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </section>

            <section className="border-t border-subtle pt-6">
              <div className="flex items-center gap-2 mb-5">
                <Clock3 className="h-4 w-4 text-violet-500" />
                <h2 className="text-base font-semibold text-hi">Activity</h2>
              </div>

              <div className="space-y-4">
                {activity.length === 0 ? (
                  <div className="text-sm text-weak bg-inset rounded-xl px-4 py-6 text-center">
                    No activity recorded yet.
                  </div>
                ) : (
                  activity.map((entry) => (
                    <div key={entry.id} className="flex gap-3">
                      <Avatar src={entry.user?.avatar_url} name={entry.user?.full_name ?? ''} size="xs" />
                      <div className="flex-1">
                        <p className="text-sm text-body">
                          <span className="font-semibold text-hi">{entry.user?.full_name}</span>
                          <span className="text-dim"> {entry.action}</span>
                        </p>
                        <p className="text-xs text-weak mt-1">{formatTimeAgo(entry.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="xl:border-l xl:border-subtle xl:pl-6 sticky top-20">
            <h2 className="text-sm font-semibold text-weak uppercase tracking-wider mb-4">Task Details</h2>

            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-weak mb-1.5">Status</p>
                <select
                  value={task.status}
                  onChange={(event) => handleStatusChange(event.target.value as TaskStatus)}
                  className="w-full text-sm border border-base rounded-xl px-3 py-2.5 bg-surface text-hi focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((status) => (
                    <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-xs font-medium text-weak mb-2">Reporter</p>
                {task.reporter ? (
                  <div className="flex items-center gap-3">
                    <Avatar src={task.reporter.avatar_url} name={task.reporter.full_name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-hi">{task.reporter.full_name}</p>
                      <p className="text-xs text-dim">{task.reporter.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-dim">Not assigned</p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-weak mb-2">Assignees</p>
                {can('assign_tasks') ? (
                  <MultiUserSelect
                    options={users.map((u) => ({ value: u.id, label: u.full_name }))}
                    value={task.assignee_ids ?? []}
                    onChange={async (ids) => {
                      await updateTask.mutateAsync({
                        id: task.id,
                        projectId: task.project_id,
                        updates: { assignee_ids: ids },
                      });
                    }}
                    disabled={updateTask.isPending}
                    placeholder="Unassigned"
                  />
                ) : (
                  <div className="space-y-2">
                    {task.assignees && task.assignees.length > 0 ? (
                      task.assignees.map((assignee) => (
                        <div key={assignee.id} className="flex items-center gap-3">
                          <Avatar src={assignee.avatar_url} name={assignee.full_name} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-hi truncate">{assignee.full_name}</p>
                            <p className="text-xs text-dim capitalize">{assignee.role.replace('_', ' ')}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-dim">No assignees yet</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-xs font-medium text-weak mb-1.5">Priority</p>
                  <div className="relative">
                    <select
                      value={task.priority}
                      onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                      disabled={updateTask.isPending}
                      className={cn(
                        'w-full text-sm border rounded-xl pl-7 pr-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
                        task.priority === 'critical' && 'border-red-200 text-red-700 bg-red-50',
                        task.priority === 'high' && 'border-orange-200 text-orange-700 bg-orange-50',
                        task.priority === 'medium' && 'border-blue-200 text-blue-700 bg-blue-50',
                        task.priority === 'low' && 'border-gray-200 text-gray-600 bg-gray-50'
                      )}
                    >
                      {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                        <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                      ))}
                    </select>
                    <span
                      className={cn(
                        'pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full',
                        PRIORITY_DOT_COLORS[task.priority]
                      )}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-weak mb-1.5">Due Date</p>
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <Calendar className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-weak" />
                      <input
                        type="date"
                        value={task.due_date ? task.due_date.substring(0, 10) : ''}
                        onChange={(e) => handleDueDateChange(e.target.value)}
                        disabled={updateTask.isPending}
                        className="w-full text-sm border border-base rounded-xl pl-8 pr-3 py-2 bg-surface text-hi focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    {task.due_date && (
                      <button
                        onClick={() => handleDueDateChange('')}
                        disabled={updateTask.isPending}
                        title="Clear due date"
                        className="shrink-0 p-1.5 rounded-lg hover:bg-hover transition-colors text-weak hover:text-dim disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-weak mb-1.5">Story Points</p>
                  <div className="flex items-center gap-2 text-sm font-semibold text-body">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    {task.story_points ?? 0} points
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Tag className="h-3.5 w-3.5 text-weak" />
                    <p className="text-xs font-medium text-weak">Tags</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(task.labels ?? []).map((label) => (
                        <span
                          key={label}
                          className={cn(
                            'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border',
                            LABEL_COLORS[label]
                          )}
                        >
                          <TaskLabelIcon label={label} className="h-3 w-3 opacity-90" strokeWidth={2.25} />
                          {LABEL_LABELS[label]}
                          <button
                            onClick={() => handleLabelToggle(label)}
                            disabled={updateTask.isPending}
                            title={`Remove ${LABEL_LABELS[label]}`}
                            className="ml-0.5 rounded-full hover:opacity-70 transition-opacity disabled:opacity-40"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      {(task.labels ?? []).length === 0 && (
                        <p className="text-sm text-weak italic">No tags added</p>
                      )}
                    </div>

                    <div className="relative" ref={tagDropdownRef}>
                      <button
                        onClick={() => setShowTagDropdown((prev) => !prev)}
                        disabled={updateTask.isPending}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add tag
                      </button>

                      {showTagDropdown && (
                        <div className="absolute left-0 top-6 z-30 w-52 bg-overlay border border-base rounded-xl shadow-xl p-1.5 animate-fade-in">
                          {(Object.keys(LABEL_LABELS) as TaskLabel[]).map((label) => {
                            const isSelected = task.labels?.includes(label) ?? false;
                            return (
                              <button
                                key={label}
                                onClick={() => handleLabelToggle(label)}
                                disabled={updateTask.isPending}
                                className={cn(
                                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium transition-colors disabled:opacity-50',
                                  isSelected
                                    ? 'bg-inset text-dim'
                                    : 'hover:bg-hover text-body'
                                )}
                              >
                                <span
                                  className={cn(
                                    'flex shrink-0 h-6 w-6 items-center justify-center rounded-md border',
                                    LABEL_COLORS[label]
                                  )}
                                >
                                  <TaskLabelIcon label={label} className="h-3.5 w-3.5" strokeWidth={2.25} />
                                </span>
                                <span className="flex-1">{LABEL_LABELS[label]}</span>
                                {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" aria-hidden />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-weak mb-1.5">Project</p>
                  <div className="flex items-center gap-2 text-sm text-body">
                    <FolderKanban className="h-3.5 w-3.5 text-weak" />
                    {project?.name ?? 'Unknown project'}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-weak mb-1.5">Created</p>
                  <div className="flex items-center gap-2 text-sm text-body">
                    <User className="h-3.5 w-3.5 text-weak" />
                    {formatDate(task.created_at)}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-weak mb-1.5">Team</p>
                  <div className="flex items-center gap-2 text-sm text-body">
                    <Users className="h-3.5 w-3.5 text-weak" />
                    {(task.assignees?.length ?? 0) + (task.reporter ? 1 : 0)} people involved
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-weak mb-1.5">Type</p>
                  <div className="flex items-center gap-2 text-sm text-body">
                    <Flag className="h-3.5 w-3.5 text-weak" />
                    {task.labels?.[0] ? LABEL_LABELS[task.labels[0]] : 'General task'}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
