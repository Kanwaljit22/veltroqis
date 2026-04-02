import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSchemaError } from '../lib/supabase';
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

      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: false });

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

      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'active')
        .limit(1);

      if (error) {
        if (isSchemaError(error)) return null;
        throw new Error(error.message);
      }
      return (data?.[0] ?? null) as Sprint | null;
    },
    staleTime: 30_000,
  });
}

// Burndown chart data is computed server-side in a future iteration.
// Returns empty until the burndown_points table/RPC is implemented.
export function useBurndownData(_sprintId?: string) {
  return useQuery({
    queryKey: ['burndown', _sprintId],
    queryFn: (): BurndownPoint[] => [],
    enabled: !!_sprintId,
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
