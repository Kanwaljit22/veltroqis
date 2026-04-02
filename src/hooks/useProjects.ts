import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSchemaError, isNotFoundError } from '../lib/supabase';
import { QUERY_KEYS } from '../lib/queryKeys';
import { toast } from '../components/ui/Toast';
import { useAuthStore } from '../store/authStore';
import { notifyProjectStakeholdersAdminAction } from '../lib/notifyStakeholders';
import { filterAccessibleProjects } from '../lib/permissions';
import type { Project, ProjectStatus, User } from '../types';

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useProjects() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const role = user?.role;

  return useQuery({
    queryKey: QUERY_KEYS.projects(userId),
    queryFn: async (): Promise<Project[]> => {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        if (isSchemaError(error)) return [];
        throw new Error(error.message);
      }

      const [{ data: users }, { data: members }, { data: taskCounts }] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('project_members').select('project_id, user_id'),
        supabase.from('tasks').select('project_id, status'),
      ]);

      const userMap: Record<string, User> = {};
      (users ?? []).forEach((u) => { userMap[u.id] = u as User; });

      const hydratedProjects = (projects ?? []).map((p) => {
        const projectMembers = (members ?? [])
          .filter((m) => m.project_id === p.id)
          .map((m) => userMap[m.user_id])
          .filter(Boolean) as User[];

        const projectTasks = (taskCounts ?? []).filter((t) => t.project_id === p.id);

        return {
          ...p,
          status: p.status as ProjectStatus,
          lead: userMap[p.lead_id ?? ''] ?? null,
          members: projectMembers,
          task_count: projectTasks.length,
          completed_task_count: projectTasks.filter((t) => t.status === 'done').length,
        } as Project;
      });

      return filterAccessibleProjects(hydratedProjects, userId, role);
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.project(id),
    queryFn: async (): Promise<Project | null> => {
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        if (isSchemaError(error) || isNotFoundError(error)) return null;
        throw new Error(error.message);
      }
      if (!project) return null;

      const [{ data: users }, { data: members }, { data: taskCounts }] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('project_members').select('user_id').eq('project_id', id),
        supabase.from('tasks').select('status').eq('project_id', id),
      ]);

      const userMap: Record<string, User> = {};
      (users ?? []).forEach((u) => { userMap[u.id] = u as User; });

      const projectMembers = (members ?? [])
        .map((m) => userMap[m.user_id])
        .filter(Boolean) as User[];

      return {
        ...project,
        status: project.status as ProjectStatus,
        lead: userMap[project.lead_id ?? ''] ?? null,
        members: projectMembers,
        task_count: (taskCounts ?? []).length,
        completed_task_count: (taskCounts ?? []).filter((t) => t.status === 'done').length,
      } as Project;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeDate(value: string | null | undefined): string | null {
  return value && value.trim() !== '' ? value : null;
}

function sanitizeProjectUpdate(updates: Partial<Project>) {
  const {
    lead: _lead,
    members: _members,
    task_count: _tc,
    completed_task_count: _ctc,
    ...dbFields
  } = updates;
  return {
    ...dbFields,
    start_date: normalizeDate(dbFields.start_date),
    deadline: normalizeDate(dbFields.deadline),
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Pick<Project, 'name' | 'description' | 'status' | 'lead_id' | 'start_date' | 'deadline'> & {
        created_by: string;
      }
    ) => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...input,
          start_date: normalizeDate(input.start_date),
          deadline: normalizeDate(input.deadline),
        })
        .select()
        .maybeSingle();
      if (error) throw new Error(`[projects.insert] ${error.message} (code: ${error.code})`);
      if (!data) throw new Error('Project was created but could not be retrieved');

      await supabase.from('project_members').insert({
        project_id: data.id,
        user_id: input.created_by,
      });
      return data as Project;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.projects() });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.activityLogs });
      toast.success('Project created');
      void notifyProjectStakeholdersAdminAction({
        projectId: data.id,
        type: 'project.created',
        title: 'New project',
        message: `An admin created project "${data.name}".`,
        entityType: 'project',
        entityId: data.id,
      });
    },
    onError: (err: Error) => toast.error('Failed to create project', err.message),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
      const safeUpdates = sanitizeProjectUpdate(updates);

      const { data, error } = await supabase
        .from('projects')
        .update({ ...safeUpdates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw new Error(`[projects.update] ${error.message} (code: ${error.code})`);
      if (!data) throw new Error('Project not found or update was blocked by permissions');
      return data as Project;
    },
    onSuccess: (data, { id }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.projects() });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.project(id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.activityLogs });
      toast.success('Project updated');
      void notifyProjectStakeholdersAdminAction({
        projectId: id,
        type: 'project.updated',
        title: 'Project updated',
        message: `An admin updated project "${(data as Project).name ?? 'Project'}".`,
        entityType: 'project',
        entityId: id,
      });
    },
    onError: (err: Error) => toast.error('Update failed', err.message),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await notifyProjectStakeholdersAdminAction({
        projectId: id,
        type: 'project.deleted',
        title: 'Project removed',
        message: `An admin deleted project "${name}".`,
        entityType: 'project',
        entityId: id,
      });
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw new Error(`[projects.delete] ${error.message} (code: ${error.code})`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.projects() });
      toast.success('Project deleted');
    },
    onError: (err: Error) => toast.error('Delete failed', err.message),
  });
}
