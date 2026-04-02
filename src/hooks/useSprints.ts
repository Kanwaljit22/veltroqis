import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured, isSchemaError } from '../lib/supabase';
import { MOCK_SPRINTS, MOCK_BURNDOWN_DATA } from '../lib/mockData';
import { QUERY_KEYS } from '../lib/queryKeys';
import { toast } from '../components/ui/Toast';
import { notifyProjectStakeholdersAdminAction } from '../lib/notifyStakeholders';
import type { Sprint, BurndownPoint } from '../types';

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useSprints(projectId?: string) {
  return useQuery({
    queryKey: ['sprints', projectId],
    queryFn: async (): Promise<Sprint[]> => {
      if (!projectId) return [];

      if (!isSupabaseConfigured()) {
        return MOCK_SPRINTS.filter((s) => s.project_id === projectId);
      }
      let query = supabase
        .from('sprints')
        .select('*')
        .order('start_date', { ascending: false });
      query = query.eq('project_id', projectId);
      const { data, error } = await query;
      if (error) {
        if (isSchemaError(error)) return [];
        throw new Error(error.message);
      }
      return (data ?? []) as Sprint[];
    },
    staleTime: 30_000,
  });
}

export function useActiveSprint(projectId?: string) {
  return useQuery({
    queryKey: ['sprints', 'active', projectId],
    queryFn: async (): Promise<Sprint | null> => {
      if (!projectId) return null;

      if (!isSupabaseConfigured()) {
        return MOCK_SPRINTS.find(
          (s) => s.status === 'active' && s.project_id === projectId
        ) ?? null;
      }
      let query = supabase.from('sprints').select('*').eq('status', 'active').limit(1);
      query = query.eq('project_id', projectId);
      const { data, error } = await query;
      if (error) {
        if (isSchemaError(error)) return null;
        throw new Error(error.message);
      }
      return (data?.[0] ?? null) as Sprint | null;
    },
    staleTime: 30_000,
  });
}

export function useBurndownData(sprintId?: string) {
  return useQuery({
    queryKey: ['burndown', sprintId],
    queryFn: async (): Promise<BurndownPoint[]> => {
      if (!isSupabaseConfigured() || !sprintId) return MOCK_BURNDOWN_DATA;
      // In a real app, compute from task completion timestamps
      return MOCK_BURNDOWN_DATA;
    },
    enabled: !!sprintId,
    staleTime: 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Pick<Sprint, 'project_id' | 'name' | 'goal' | 'start_date' | 'end_date'>
    ): Promise<Sprint> => {
      if (!isSupabaseConfigured()) {
        return {
          id: `s${Date.now()}`,
          ...input,
          status: 'planning',
          created_at: new Date().toISOString(),
          total_story_points: 0,
          completed_story_points: 0,
        } as Sprint;
      }
      const { data, error } = await supabase
        .from('sprints')
        .insert({ ...input, status: 'planning' as const })
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Sprint was created but could not be retrieved');
      return data as Sprint;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['sprints', data.project_id] });
      toast.success('Sprint created');
      void notifyProjectStakeholdersAdminAction({
        projectId: data.project_id,
        type: 'sprint.created',
        title: 'New sprint',
        message: `An admin created sprint "${data.name}".`,
        entityType: 'sprint',
        entityId: data.id,
      });
    },
    onError: (err: Error) => toast.error('Failed to create sprint', err.message),
  });
}

export function useUpdateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      updates,
    }: {
      id: string;
      projectId: string;
      updates: Partial<Sprint>;
    }): Promise<Sprint> => {
      if (!isSupabaseConfigured()) return { id, project_id: projectId, ...updates } as Sprint;
      const { data, error } = await supabase
        .from('sprints')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Sprint not found or update was blocked by permissions');
      return data as Sprint;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['sprints', data.project_id] });
      qc.invalidateQueries({ queryKey: ['sprints', 'active', data.project_id] });
      toast.success('Sprint updated');
      void notifyProjectStakeholdersAdminAction({
        projectId: data.project_id,
        type: 'sprint.updated',
        title: 'Sprint updated',
        message: `An admin updated sprint "${data.name}".`,
        entityType: 'sprint',
        entityId: data.id,
      });
    },
    onError: (err: Error) => toast.error('Failed to update sprint', err.message),
  });
}

export function useStartSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      name,
    }: {
      id: string;
      projectId: string;
      name: string;
    }) => {
      if (!isSupabaseConfigured()) return { id, projectId, name };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('sprints')
        .update({ status: 'active' })
        .eq('id', id);
      if (error) throw new Error(error.message);
      return { id, projectId, name };
    },
    onSuccess: ({ projectId, id, name }) => {
      qc.invalidateQueries({ queryKey: ['sprints', projectId] });
      qc.invalidateQueries({ queryKey: ['sprints', 'active', projectId] });
      toast.success('Sprint started');
      void notifyProjectStakeholdersAdminAction({
        projectId,
        type: 'sprint.started',
        title: 'Sprint started',
        message: `An admin started sprint "${name}".`,
        entityType: 'sprint',
        entityId: id,
      });
    },
    onError: (err: Error) => toast.error('Failed to start sprint', err.message),
  });
}

export function useCompleteSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      name,
    }: {
      id: string;
      projectId: string;
      name: string;
    }) => {
      if (!isSupabaseConfigured()) return { id, projectId, name };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('sprints')
        .update({ status: 'completed' })
        .eq('id', id);
      if (error) throw new Error(error.message);
      return { id, projectId, name };
    },
    onSuccess: ({ projectId, id, name }) => {
      qc.invalidateQueries({ queryKey: ['sprints', projectId] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks(projectId) });
      toast.success('Sprint completed');
      void notifyProjectStakeholdersAdminAction({
        projectId,
        type: 'sprint.completed',
        title: 'Sprint completed',
        message: `An admin completed sprint "${name}".`,
        entityType: 'sprint',
        entityId: id,
      });
    },
    onError: (err: Error) => toast.error('Failed to complete sprint', err.message),
  });
}
