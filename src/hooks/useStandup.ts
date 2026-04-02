import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../lib/queryKeys';
import { toast } from '../components/ui/Toast';
import type { StandupSession, StandupEntry, StandupBlocker, StandupTaskLink } from '../types';

// Daily Scrum / Stand-up data is maintained in-memory until a dedicated
// Supabase schema is added. Mutations update the local store and React Query
// cache; data does not persist across page reloads.

let _sessions: StandupSession[] = [];

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useStandupSessions(projectId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.standupSessions(projectId),
    queryFn: (): StandupSession[] =>
      projectId
        ? _sessions.filter((s) => s.project_id === projectId)
        : [..._sessions],
    staleTime: 15_000,
  });
}

export function useTodayStandup(projectId: string) {
  const today = new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: QUERY_KEYS.standupToday(projectId),
    queryFn: (): StandupSession | null =>
      _sessions.find((s) => s.project_id === projectId && s.date === today) ?? null,
    staleTime: 10_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateStandupSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      sprint_id?: string;
      mode: 'async' | 'live';
      meeting_link?: string;
    }): Promise<StandupSession> => {
      const today = new Date().toISOString().split('T')[0];
      const existing = _sessions.find(
        (s) => s.project_id === input.project_id && s.date === today
      );
      if (existing) return existing;

      const session: StandupSession = {
        id: `ss-${Date.now()}`,
        project_id: input.project_id,
        sprint_id: input.sprint_id,
        date: today,
        mode: input.mode,
        status: 'upcoming',
        meeting_link: input.meeting_link,
        entries: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      _sessions = [session, ..._sessions];
      return session;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.standupSessions(data.project_id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.standupToday(data.project_id) });
      toast.success('Stand-up session created');
    },
    onError: (err: Error) => toast.error('Failed to create session', err.message),
  });
}

export function useStartStandupSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      _sessions = _sessions.map((s) =>
        s.id === id
          ? { ...s, status: 'in_progress', started_at: new Date().toISOString(), updated_at: new Date().toISOString() }
          : s
      );
      return { id, projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.standupSessions(projectId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.standupToday(projectId) });
      toast.success('Stand-up started');
    },
    onError: (err: Error) => toast.error('Failed to start stand-up', err.message),
  });
}

export function useCompleteStandupSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      notes,
    }: {
      id: string;
      projectId: string;
      notes?: string;
    }) => {
      _sessions = _sessions.map((s) => {
        if (s.id !== id) return s;
        const attended = s.entries.filter((e) => e.attended).length;
        const blockers = s.entries.flatMap((e) => e.blockers.filter((b) => !b.resolved));
        return {
          ...s,
          status: 'completed' as const,
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          summary: {
            completed_tasks: s.entries.flatMap((e) => e.yesterday).length,
            in_progress_tasks: s.entries.flatMap((e) => e.today).length,
            blockers_count: blockers.length,
            attendees: attended,
            total_members: s.entries.length,
            notes,
          },
        };
      });
      return { id, projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.standupSessions(projectId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.standupToday(projectId) });
      toast.success('Stand-up completed. Summary saved.');
    },
    onError: (err: Error) => toast.error('Failed to complete stand-up', err.message),
  });
}

export function useSubmitStandupEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      session_id: string;
      project_id: string;
      user_id: string;
      yesterday: StandupTaskLink[];
      today: StandupTaskLink[];
      blockers: Omit<StandupBlocker, 'id'>[];
    }): Promise<StandupEntry> => {
      const { session_id, user_id, yesterday, today, blockers } = input;

      const entry: StandupEntry = {
        id: `se-${Date.now()}`,
        session_id,
        user_id,
        yesterday,
        today,
        blockers: blockers.map((b, i) => ({ ...b, id: `sb-${Date.now()}-${i}` })),
        submitted_at: new Date().toISOString(),
        attended: true,
      };

      _sessions = _sessions.map((s) => {
        if (s.id !== session_id) return s;
        const existingIdx = s.entries.findIndex((e) => e.user_id === user_id);
        const updatedEntries =
          existingIdx >= 0
            ? s.entries.map((e, i) => (i === existingIdx ? entry : e))
            : [...s.entries, entry];
        return { ...s, entries: updatedEntries, updated_at: new Date().toISOString() };
      });

      return { ...entry, project_id: input.project_id } as StandupEntry & { project_id: string };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.standupSessions(vars.project_id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.standupToday(vars.project_id) });
      toast.success('Stand-up update submitted');
    },
    onError: (err: Error) => toast.error('Failed to submit update', err.message),
  });
}

export function useResolveBlocker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      entryId,
      blockerId,
      projectId,
    }: {
      sessionId: string;
      entryId: string;
      blockerId: string;
      projectId: string;
    }) => {
      _sessions = _sessions.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          entries: s.entries.map((e) => {
            if (e.id !== entryId) return e;
            return {
              ...e,
              blockers: e.blockers.map((b) =>
                b.id === blockerId ? { ...b, resolved: true } : b
              ),
            };
          }),
          updated_at: new Date().toISOString(),
        };
      });
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.standupSessions(projectId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.standupToday(projectId) });
      toast.success('Blocker marked as resolved');
    },
    onError: (err: Error) => toast.error('Failed to resolve blocker', err.message),
  });
}
