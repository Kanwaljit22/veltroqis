import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
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
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, GripVertical, MessageSquare, Calendar, Search,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal, ModalFooter } from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { MultiUserSelect } from '../components/ui/MultiUserSelect';
import { AvatarGroup } from '../components/ui/Avatar';
import { EllipsisTooltip } from '../components/ui/EllipsisTooltip';
import { PageLoadingSpinner, ErrorState } from '../components/ui/Skeleton';
import {
  PRIORITY_COLORS, PRIORITY_LABELS, PRIORITY_DOT_COLORS, formatDate, cn,
} from '../lib/utils';
import { useTasks, useCreateTask, useUpdateTask } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useUsers } from '../hooks/useUsers';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../lib/permissions';
import { PermissionGuard } from '../components/ui/PermissionGuard';
import type { Task, TaskStatus, TaskPriority } from '../types';

const COLUMNS: { id: TaskStatus; label: string; color: string; bg: string }[] = [
  { id: 'todo', label: 'To Do', color: 'text-slate-600', bg: 'bg-slate-100' },
  { id: 'in_progress', label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'review', label: 'Review', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { id: 'done', label: 'Done', color: 'text-green-600', bg: 'bg-green-50' },
];

const schema = z.object({
  title: z.string().min(1, 'Title required'),
  description: z.string().optional(),
  priority: z.string().min(1, 'Priority required'),
  due_date: z.string().optional(),
  project_id: z.string().min(1, 'Project required'),
});
type FormData = z.infer<typeof schema>;

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

/** Prefer pointer hit targets so empty columns still get a drop target; fall back to corners. */
const boardCollisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  if (pointer.length > 0) return pointer;
  const rect = rectIntersection(args);
  if (rect.length > 0) return rect;
  return closestCorners(args);
};

// ─── Card presentation (shared by sortable card + drag overlay) ─────────────────

const TaskCardBody: React.FC<{
  task: Task;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  overlay?: boolean;
}> = ({ task, dragHandleProps, overlay }) => (
  <div
    className={cn(
      'bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm cursor-pointer group hover:shadow-md transition-all',
      overlay && 'shadow-2xl rotate-2 scale-105 cursor-grabbing'
    )}
  >
    <div className="flex items-start gap-2">
      <div
        {...dragHandleProps}
        className="mt-0.5 p-0.5 rounded text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-2">
          <div className={cn('h-2 w-2 rounded-full shrink-0', PRIORITY_DOT_COLORS[task.priority])} />
          <Badge className={cn(PRIORITY_COLORS[task.priority], 'text-[10px] py-0')} size="sm">
            {PRIORITY_LABELS[task.priority]}
          </Badge>
        </div>
        <p
          className={cn(
            'text-sm font-medium text-slate-800 leading-snug line-clamp-2',
            task.description?.trim() ? 'mb-1.5' : 'mb-3'
          )}
        >
          {task.title}
        </p>
        {task.description?.trim() ? (
          <EllipsisTooltip
            text={task.description.trim()}
            disabled={!!overlay}
            className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3 wrap-break-word"
          />
        ) : null}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
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
  </div>
);

const SortableTaskCard: React.FC<{ task: Task; onView: (t: Task) => void }> = ({ task, onView }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 };

  return (
    <div ref={setNodeRef} style={style} onClick={() => onView(task)}>
      <TaskCardBody task={task} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
};

// ─── Column with explicit droppable (empty columns still accept drops) ────────

const KanbanColumn: React.FC<{
  col: (typeof COLUMNS)[number];
  colTasks: Task[];
  onTaskView: (t: Task) => void;
}> = ({ col, colTasks, onTaskView }) => {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div className="flex flex-col gap-2">
      <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl', col.bg)}>
        <span className={cn('text-sm font-semibold', col.color)}>{col.label}</span>
        <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full bg-white/60', col.color)}>
          {colTasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 min-h-[140px] rounded-xl p-1 -m-1 transition-colors',
          isOver && 'bg-blue-50/70 ring-2 ring-blue-300/60'
        )}
      >
        <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {colTasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onView={onTaskView} />
          ))}
        </SortableContext>
        {colTasks.length === 0 && (
          <div className="h-24 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-slate-400">Drop tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const TaskBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { can } = usePermissions();

  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: users = [] } = useUsers();

  const [projectFilter, setProjectFilter] = useState('');
  const [search, setSearch] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createColumn, setCreateColumn] = useState<TaskStatus>('todo');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  // Use first project as default when data loads
  const effectiveProject = projectFilter || projects[0]?.id || '';

  const { data: tasks = [], isLoading: tasksLoading, error, refetch } = useTasks(effectiveProject || undefined);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium' },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredTasks = tasks.filter((t) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  const getColumnTasks = (status: TaskStatus) =>
    filteredTasks.filter((t) => t.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || !effectiveProject) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeTaskData = tasks.find((t) => t.id === activeId);
    if (!activeTaskData) return;

    // Drop on column droppable (incl. empty columns) or on another card
    let targetStatus: TaskStatus | undefined;
    if (COLUMNS.some((c) => c.id === overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
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

  const openCreate = (status: TaskStatus) => {
    setCreateColumn(status);
    reset({ priority: 'medium', project_id: effectiveProject });
    setValue('project_id', effectiveProject);
    setAssigneeIds([]);
    setCreateModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    await createTask.mutateAsync({
      project_id: data.project_id,
      title: data.title,
      description: data.description,
      status: createColumn,
      priority: data.priority as TaskPriority,
      assignee_ids: assigneeIds,
      reporter_id: currentUser?.id ?? '',
      due_date: data.due_date,
    });
    setCreateModalOpen(false);
    reset();
    setAssigneeIds([]);
  };

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const userOptions = [
    { value: '', label: 'Unassigned' },
    ...users.map((u) => ({ value: u.id, label: u.full_name })),
  ];
  const assigneeOptions = userOptions.filter((o) => o.value !== '');

  const boardLoading =
    projectsLoading || (!!effectiveProject && tasksLoading);

  if (error) {
    return <ErrorState message="Failed to load tasks" onRetry={refetch} />;
  }

  return (
    <div className="space-y-5 h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Task Board</h1>
          <p className="text-sm text-slate-500 mt-0.5">Drag and drop tasks across columns</p>
        </div>
        <PermissionGuard permission="assign_tasks">
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => openCreate('todo')}>
            Add Task
          </Button>
        </PermissionGuard>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-xs">
          <Input
            placeholder="Search tasks..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-52">
          <Select
            options={[{ value: '', label: 'All Projects' }, ...projectOptions]}
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Kanban Board */}
      {boardLoading ? (
        <PageLoadingSpinner
          message={projectsLoading ? 'Loading projects…' : 'Loading tasks…'}
          className="min-h-[min(60vh,28rem)]"
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={boardCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {COLUMNS.map((col) => {
              const colTasks = getColumnTasks(col.id);
              return (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  colTasks={colTasks}
                  onTaskView={(selectedTask) => navigate(`/tasks/${selectedTask.id}?from=tasks`)}
                />
              );
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? <TaskCardBody task={activeTask} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Create Task Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => { setCreateModalOpen(false); reset(); setAssigneeIds([]); }}
        title="Create Task"
        description={`Adding to ${COLUMNS.find((c) => c.id === createColumn)?.label}`}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Title" placeholder="Task title..." error={errors.title?.message} {...register('title')} />
          <Textarea label="Description" placeholder="Describe the task..." rows={3} {...register('description')} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Project" options={projectOptions} placeholder="Select project"
              error={errors.project_id?.message} {...register('project_id')} />
            <Select label="Priority" options={PRIORITY_OPTIONS} error={errors.priority?.message} {...register('priority')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {can('assign_tasks') ? (
              <div className="col-span-2">
                <MultiUserSelect
                  label="Assignees"
                  options={assigneeOptions}
                  value={assigneeIds}
                  onChange={setAssigneeIds}
                  placeholder="Unassigned"
                />
              </div>
            ) : null}
            <Input label="Due Date" type="date" {...register('due_date')} />
          </div>
          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => { setCreateModalOpen(false); reset(); setAssigneeIds([]); }}>Cancel</Button>
            <Button type="submit" loading={createTask.isPending}>Create Task</Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
};
