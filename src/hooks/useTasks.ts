import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured, isSchemaError, isNotFoundError } from '../lib/supabase';
import { MOCK_TASKS, MOCK_USERS } from '../lib/mockData';
import { QUERY_KEYS } from '../lib/queryKeys';
import { toast } from '../components/ui/Toast';
import { notifyProjectStakeholdersAdminAction } from '../lib/notifyStakeholders';
import { PRIORITY_LABELS, LABEL_LABELS, formatDate } from '../lib/utils';
import type { Task, TaskStatus, TaskPriority, TaskLabel, User } from '../types';

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useTasks(projectId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.tasks(projectId),
    queryFn: async (): Promise<Task[]> => {
      if (!projectId) return [];
      if (!isSupabaseConfigured()) return MOCK_TASKS.filter((t) => t.project_id === projectId);

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');

      if (error) {
        if (isSchemaError(error)) return [];
        throw new Error(error.message);
      }

      const { data: users } = await supabase.from('users').select('*');
      const userMap: Record<string, User> = {};
      (users ?? []).forEach((u) => { userMap[u.id] = u as User; });

      return (tasks ?? []).map((t) => ({
        ...t,
        status: t.status as TaskStatus,
        priority: t.priority as TaskPriority,
        assignees: (t.assignee_ids ?? []).map((id: string) => userMap[id]).filter(Boolean) as User[],
        reporter: userMap[t.reporter_id] ?? null,
      })) as Task[];
    },
    staleTime: 15_000,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.task(id),
    queryFn: async (): Promise<Task | null> => {
      if (!id) return null;
      if (!isSupabaseConfigured()) return MOCK_TASKS.find((t) => t.id === id) ?? null;

      // maybeSingle → null (not 406) when task doesn't exist or RLS blocks it
      const { data: task, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (isSchemaError(error) || isNotFoundError(error)) return null;
        throw new Error(error.message);
      }
      if (!task) return null;

      const { data: users } = await supabase.from('users').select('*');
      const userMap: Record<string, User> = {};
      (users ?? []).forEach((u) => { userMap[u.id] = u as User; });

      return {
        ...task,
        status: task.status as TaskStatus,
        priority: task.priority as TaskPriority,
        assignees: (task.assignee_ids ?? []).map((assigneeId: string) => userMap[assigneeId]).filter(Boolean) as User[],
        reporter: userMap[task.reporter_id] ?? null,
      } as Task;
    },
    enabled: !!id,
    staleTime: 15_000,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strips client-side enrichment fields that do not exist as columns in the
 * `tasks` table.  Spreading a full `Task` object into `.update()` would send
 * `assignees`, `reporter`, `subtasks`, `project`, etc. to PostgREST, which
 * rejects unknown columns with a 500 error.
 */
function sanitizeTaskUpdate(updates: Partial<Task>) {
  const {
    assignees: _assignees,
    reporter: _reporter,
    subtasks: _subtasks,
    project: _project,
    attachments: _attachments,
    dependencies: _deps,
    ...dbFields
  } = updates;
  return dbFields;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Pick<Task, 'project_id' | 'title' | 'description' | 'status' | 'priority' | 'assignee_ids' | 'reporter_id' | 'due_date'>
    ) => {
      if (!isSupabaseConfigured()) {
        return {
          id: `t${Date.now()}`,
          ...input,
          assignees: input.assignee_ids
            .map((id) => MOCK_USERS.find((u) => u.id === id))
            .filter(Boolean) as User[],
          reporter: MOCK_USERS.find((u) => u.id === input.reporter_id),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          comment_count: 0,
          order_index: 0,
        } as Task;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert(input)
        .select()
        .maybeSingle();
      if (error) throw new Error(`[tasks.insert] ${error.message} (code: ${error.code})`);
      if (!data) throw new Error('Task was created but could not be retrieved');
      return data as Task;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks(data.project_id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks() });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.activityLogs });
      qc.invalidateQueries({ queryKey: ['activity'] });
      toast.success('Task created');
      void notifyProjectStakeholdersAdminAction({
        projectId: data.project_id,
        type: 'task.created',
        title: 'New task',
        message: `An admin created task "${data.title}".`,
        entityType: 'task',
        entityId: data.id,
        extraUserIds: data.assignee_ids ?? [],
      });
    },
    onError: (err: Error) => toast.error('Failed to create task', err.message),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      updates,
    }: {
      id: string;
      projectId: string;
      updates: Partial<Task>;
    }) => {
      if (!isSupabaseConfigured()) return { id, projectId, ...updates } as Task;

      const safeUpdates = sanitizeTaskUpdate(updates);

      const { data, error } = await supabase
        .from('tasks')
        .update({ ...safeUpdates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw new Error(`[tasks.update] ${error.message} (code: ${error.code})`);
      if (!data) throw new Error('Task not found or update was blocked by permissions');
      return data as Task;
    },
    // Optimistic update for Kanban drag-and-drop feel
    onMutate: async ({ id, projectId, updates }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.tasks(projectId) });
      const previous = qc.getQueryData<Task[]>(QUERY_KEYS.tasks(projectId));
      qc.setQueryData<Task[]>(QUERY_KEYS.tasks(projectId), (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
      return { previous, projectId };
    },
    onError: (err: Error, _, context) => {
      if (context?.previous) {
        qc.setQueryData(QUERY_KEYS.tasks(context.projectId), context.previous);
      }
      toast.error('Update failed', err.message);
    },
    onSuccess: (data, { updates, projectId, id }) => {
      const keys = Object.keys(updates).filter(
        (k) => !['order_index', 'updated_at'].includes(k)
      );
      if (keys.length === 0) return;

      // Field-specific toast notifications
      if ('priority' in updates && updates.priority) {
        toast.success(
          'Priority updated',
          `Changed to ${PRIORITY_LABELS[updates.priority as TaskPriority]}`
        );
      } else if ('due_date' in updates) {
        toast.success(
          'Due date updated',
          updates.due_date ? formatDate(updates.due_date as string) : 'Due date cleared'
        );
      } else if ('labels' in updates) {
        const names = ((updates.labels as TaskLabel[] | undefined) ?? [])
          .map((l) => LABEL_LABELS[l])
          .join(', ');
        toast.success('Tags updated', names || 'All tags removed');
      }

      void notifyProjectStakeholdersAdminAction({
        projectId,
        type: 'task.updated',
        title: 'Task updated',
        message: `An admin updated task "${data.title}".`,
        entityType: 'task',
        entityId: id,
        extraUserIds: (data.assignee_ids as string[] | undefined) ?? [],
      });
    },
    onSettled: (_, __, vars) => {
      if (!vars) return;
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks(vars.projectId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.task(vars.id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.activityLogs });
      qc.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      if (!isSupabaseConfigured()) return { id, projectId };
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw new Error(`[tasks.delete] ${error.message} (code: ${error.code})`);
      return { id, projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks(projectId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.activityLogs });
      qc.invalidateQueries({ queryKey: ['activity'] });
      toast.success('Task deleted');
    },
    onError: (err: Error) => toast.error('Delete failed', err.message),
  });
}
