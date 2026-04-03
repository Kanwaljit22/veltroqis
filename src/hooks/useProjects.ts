import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSchemaError, isNotFoundError } from '../lib/supabase';
import { QUERY_KEYS } from '../lib/queryKeys';
import { toast } from '../components/ui/Toast';
import { useAuthStore } from '../store/authStore';
import { notifyProjectStakeholdersAdminAction } from '../lib/notifyStakeholders';
import { filterAccessibleProjects } from '../lib/permissions';
import type { Project, ProjectStatus, User } from '../types';

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Fields selected whenever a User is embedded via a relationship join */
const USER_FIELDS =
  'id, full_name, email, role, status, avatar_url, joined_at, created_at, updated_at, designation, department, phone, location, bio';

export function useProjects() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const role = user?.role;

  return useQuery({
    queryKey: QUERY_KEYS.projects(userId),
    queryFn: async (): Promise<Project[]> => {
      // All three requests run in parallel.
      // lead and member users are embedded via PostgREST relationship joins,
      // so no separate users fetch is needed.
      const [
        { data: projects, error },
        { data: members },
        { data: taskCounts },
      ] = await Promise.all([
        supabase
          .from('projects')
          .select(`*, lead:users!lead_id(${USER_FIELDS})`)
          .order('created_at', { ascending: false }),
        supabase
          .from('project_members')
          .select(`project_id, user_id, member:users(${USER_FIELDS})`),
        supabase
          .from('tasks')
          .select('project_id, status'),
      ]);

      if (error) {
        if (isSchemaError(error)) return [];
        throw new Error(error.message);
      }

      const hydratedProjects = (projects ?? []).map((p) => {
        const projectMembers = (members ?? [])
          .filter((m) => m.project_id === p.id)
          .map((m) => m.member as unknown as User)
          .filter(Boolean) as User[];

        const projectTasks = (taskCounts ?? []).filter((t) => t.project_id === p.id);

        return {
          ...p,
          status: p.status as ProjectStatus,
          lead: (p.lead as unknown as User | null) ?? null,
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
      // All three requests run in parallel; users embedded directly — no bulk users fetch.
      const [
        { data: project, error },
        { data: members },
        { data: taskCounts },
      ] = await Promise.all([
        supabase
          .from('projects')
          .select(`*, lead:users!lead_id(${USER_FIELDS})`)
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('project_members')
          .select(`user_id, member:users(${USER_FIELDS})`)
          .eq('project_id', id),
        supabase
          .from('tasks')
          .select('status')
          .eq('project_id', id),
      ]);

      if (error) {
        if (isSchemaError(error) || isNotFoundError(error)) return null;
        throw new Error(error.message);
      }
      if (!project) return null;

      const projectMembers = (members ?? [])
        .map((m) => m.member as unknown as User)
        .filter(Boolean) as User[];

      return {
        ...project,
        status: project.status as ProjectStatus,
        lead: (project.lead as unknown as User | null) ?? null,
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
        /** IDs of users to add as project members (creator is always included) */
        member_ids?: string[];
      }
    ) => {
      const { member_ids, ...projectFields } = input;

      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...projectFields,
          start_date: normalizeDate(projectFields.start_date),
          deadline: normalizeDate(projectFields.deadline),
        })
        .select()
        .maybeSingle();
      if (error) throw new Error(`[projects.insert] ${error.message} (code: ${error.code})`);
      if (!data) throw new Error('Project was created but could not be retrieved');

      // Deduplicate: always include creator; merge with selected members
      const memberSet = new Set([input.created_by, ...(member_ids ?? [])]);
      const memberRows = Array.from(memberSet).map((user_id) => ({
        project_id: data.id,
        user_id,
      }));

      if (memberRows.length > 0) {
        const { error: membersError } = await supabase
          .from('project_members')
          .insert(memberRows);
        if (membersError) throw new Error(`[project_members.insert] ${membersError.message}`);
      }

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
    mutationFn: async ({
      id,
      updates,
      member_ids,
    }: {
      id: string;
      updates: Partial<Project>;
      /** When provided, replaces the full project_members set for this project */
      member_ids?: string[];
    }) => {
      const safeUpdates = sanitizeProjectUpdate(updates);

      const { data, error } = await supabase
        .from('projects')
        .update({ ...safeUpdates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw new Error(`[projects.update] ${error.message} (code: ${error.code})`);
      if (!data) throw new Error('Project not found or update was blocked by permissions');

      // Sync team members: delete all then re-insert the new set
      if (member_ids !== undefined) {
        const { error: delError } = await supabase
          .from('project_members')
          .delete()
          .eq('project_id', id);
        if (delError) throw new Error(`[project_members.delete] ${delError.message}`);

        if (member_ids.length > 0) {
          const { error: insError } = await supabase
            .from('project_members')
            .insert(member_ids.map((user_id) => ({ project_id: id, user_id })));
          if (insError) throw new Error(`[project_members.insert] ${insError.message}`);
        }
      }

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
