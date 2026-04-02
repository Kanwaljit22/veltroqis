import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSchemaError } from '../lib/supabase';
import { QUERY_KEYS } from '../lib/queryKeys';
import { toast } from '../components/ui/Toast';
import type { Invitation, UserRole } from '../types';

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useInvitations() {
  return useQuery({
    queryKey: QUERY_KEYS.invitations,
    queryFn: async (): Promise<Invitation[]> => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('sent_at', { ascending: false });
      if (error) {
        if (isSchemaError(error)) return [];
        throw new Error(error.message);
      }
      return data as Invitation[];
    },
    staleTime: 30_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useSendInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      email,
      role,
      message,
      invitedBy,
    }: {
      email: string;
      role: UserRole;
      message?: string;
      invitedBy: string;
    }) => {
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          email,
          role,
          message,
          invited_by: invitedBy,
          token: generateToken(),
          status: 'pending' as const,
          sent_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Invitation was sent but could not be retrieved');
      return data as unknown as Invitation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.invitations });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.activityLogs });
      toast.success('Invitation sent');
    },
    onError: (err: Error) => toast.error('Failed to send invitation', err.message),
  });
}

export function useResendInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invitations')
        .update({
          status: 'pending',
          token: generateToken(),
          sent_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', id);
      if (error) throw new Error(`[invitations.resend] ${error.message} (code: ${error.code})`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.invitations });
      toast.success('Invitation resent');
    },
    onError: (err: Error) => toast.error('Resend failed', err.message),
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.invitations });
      toast.success('Invitation revoked');
    },
    onError: (err: Error) => toast.error('Revoke failed', err.message),
  });
}
