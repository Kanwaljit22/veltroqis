import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSchemaError, isNotFoundError } from '../lib/supabase';
import { QUERY_KEYS } from '../lib/queryKeys';
import { toast } from '../components/ui/Toast';
import { useAuthStore } from '../store/authStore';
import type { User, UserRole } from '../types';

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: async (): Promise<User[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        if (isSchemaError(error)) return [];
        throw new Error(error.message);
      }
      return (data ?? []) as User[];
    },
    staleTime: 30_000,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.user(id),
    queryFn: async (): Promise<User | null> => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        if (isSchemaError(error) || isNotFoundError(error)) return null;
        throw new Error(error.message);
      }
      return data as User | null;
    },
    enabled: !!id,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type UserProfileUpdate = Pick<
  User,
  'full_name' | 'avatar_url' | 'designation' | 'department' | 'phone' | 'location' | 'bio'
>;

type UserAdminUpdate = UserProfileUpdate & Pick<User, 'email' | 'role' | 'status'>;

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<UserAdminUpdate>;
    }) => {
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw new Error(`[users.update] ${error.message} (code: ${error.code})`);
      if (!data) throw new Error('User not found or update was blocked by permissions');
      return data as User;
    },
    onSuccess: (updatedUser) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.activityLogs });
      const auth = useAuthStore.getState();
      if (auth.user?.id === updatedUser.id) {
        auth.setUser({ ...auth.user, ...updatedUser });
      }
      toast.success('User updated successfully');
    },
    onError: (err: Error) => toast.error('Update failed', err.message),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw new Error(`[users.delete] ${error.message} (code: ${error.code})`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
      toast.success('User removed');
    },
    onError: (err: Error) => toast.error('Delete failed', err.message),
  });
}

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { data, error } = await supabase
        .from('users')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw new Error(`[users.role] ${error.message} (code: ${error.code})`);
      if (!data) throw new Error('Role change blocked — ensure you have admin permissions');
      return { id, role };
    },
    onSuccess: ({ id, role }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.activityLogs });
      const auth = useAuthStore.getState();
      if (auth.user?.id === id) {
        auth.setUser({ ...auth.user, role });
      }
      toast.success('Role updated successfully');
    },
    onError: (err: Error) => toast.error('Role change failed', err.message),
  });
}
