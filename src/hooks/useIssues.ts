import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured, isSchemaError } from '../lib/supabase';
import { MOCK_ISSUES, MOCK_USERS } from '../lib/mockData';
import { QUERY_KEYS } from '../lib/queryKeys';
import { toast } from '../components/ui/Toast';
import { notifyProjectStakeholdersAdminAction } from '../lib/notifyStakeholders';
import type { Issue, IssueType, IssueSeverity, IssueStatus, User } from '../types';

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useIssues(projectId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.issues(projectId),
    queryFn: async (): Promise<Issue[]> => {
      if (!isSupabaseConfigured()) {
        return projectId
          ? MOCK_ISSUES.filter((i) => i.project_id === projectId)
          : MOCK_ISSUES;
      }

      let query = supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });
      if (projectId) query = query.eq('project_id', projectId);

      const { data: issues, error } = await query;
      if (error) {
        if (isSchemaError(error)) return [];
        throw new Error(error.message);
      }

      const { data: users } = await supabase.from('users').select('*');
      const userMap: Record<string, User> = {};
      (users ?? []).forEach((u) => { userMap[u.id] = u as User; });

      return (issues ?? []).map((i) => ({
        ...i,
        type: i.type as IssueType,
        severity: i.severity as IssueSeverity,
        status: i.status as IssueStatus,
        reporter: userMap[i.reporter_id] ?? null,
        assignee: i.assignee_id ? userMap[i.assignee_id] ?? null : null,
      })) as Issue[];
    },
    staleTime: 15_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Pick<
        Issue,
        | 'project_id'
        | 'title'
        | 'description'
        | 'type'
        | 'severity'
        | 'reporter_id'
        | 'assignee_id'
        | 'steps_to_reproduce'
      >
    ) => {
      if (!isSupabaseConfigured()) {
        return {
          id: `i${Date.now()}`,
          ...input,
          status: 'open' as IssueStatus,
          reporter: MOCK_USERS.find((u) => u.id === input.reporter_id),
          assignee: MOCK_USERS.find((u) => u.id === input.assignee_id),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          comment_count: 0,
        } as Issue;
      }
      const { data, error } = await supabase
        .from('issues')
        .insert({ ...input, status: 'open' as const })
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Issue was created but could not be retrieved');
      return data as unknown as Issue;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.issues(data.project_id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.issues() });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.activityLogs });
      qc.invalidateQueries({ queryKey: ['activity'] });
      toast.success('Issue created');
      const issueRow = data as Issue;
      void notifyProjectStakeholdersAdminAction({
        projectId: issueRow.project_id,
        type: 'issue.created',
        title: 'New issue',
        message: `An admin reported issue "${issueRow.title}".`,
        entityType: 'issue',
        entityId: issueRow.id,
        extraUserIds: issueRow.assignee_id ? [issueRow.assignee_id] : [],
      });
    },
    onError: (err: Error) => toast.error('Failed to create issue', err.message),
  });
}

export function useUpdateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Issue>;
    }) => {
      if (!isSupabaseConfigured()) return { id, ...updates } as Issue;
      const { data, error } = await supabase
        .from('issues')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Issue not found or update was blocked by permissions');
      return data as unknown as Issue;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.issues() });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.activityLogs });
      qc.invalidateQueries({ queryKey: ['activity'] });
      toast.success('Issue updated');
      const row = data as Issue;
      void notifyProjectStakeholdersAdminAction({
        projectId: row.project_id,
        type: 'issue.updated',
        title: 'Issue updated',
        message: `An admin updated issue "${row.title}".`,
        entityType: 'issue',
        entityId: row.id,
        extraUserIds: row.assignee_id ? [row.assignee_id] : [],
      });
    },
    onError: (err: Error) => toast.error('Update failed', err.message),
  });
}

export function useDeleteIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      title,
    }: {
      id: string;
      projectId: string;
      title: string;
    }) => {
      if (!isSupabaseConfigured()) return;
      await notifyProjectStakeholdersAdminAction({
        projectId,
        type: 'issue.deleted',
        title: 'Issue removed',
        message: `An admin deleted issue "${title}".`,
        entityType: 'issue',
        entityId: id,
      });
      const { error } = await supabase.from('issues').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.issues() });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.activityLogs });
      qc.invalidateQueries({ queryKey: ['activity'] });
      toast.success('Issue deleted');
    },
    onError: (err: Error) => toast.error('Delete failed', err.message),
  });
}
