import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured, isSchemaError } from '../lib/supabase';
import { QUERY_KEYS } from '../lib/queryKeys';
import { toast } from '../components/ui/Toast';
import { MOCK_COMMENTS, MOCK_USERS } from '../lib/mockData';
import type { Comment, User } from '../types';

export function useComments(entityType: Comment['entity_type'], entityId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.comments(entityType, entityId),
    queryFn: async (): Promise<Comment[]> => {
      if (!entityId) return [];

      if (!isSupabaseConfigured()) {
        return MOCK_COMMENTS.filter(
          (c) => c.entity_type === entityType && c.entity_id === entityId
        );
      }

      const { data, error } = await supabase
        .from('comments')
        .select(
          '*, author:users(id, full_name, avatar_url, email, role, status, joined_at, created_at, updated_at)'
        )
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true });

      if (error) {
        if (isSchemaError(error)) return [];
        throw new Error(error.message);
      }
      return (data ?? []) as Comment[];
    },
    enabled: !!entityId,
    staleTime: 15_000,
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      entity_type: Comment['entity_type'];
      entity_id: string;
      author_id: string;
      content: string;
      parent_id?: string | null;
    }): Promise<Comment> => {
      const trimmed = input.content.trim();
      if (!trimmed) throw new Error('Comment cannot be empty');

      if (!isSupabaseConfigured()) {
        const author = MOCK_USERS.find((u) => u.id === input.author_id) as User | undefined;
        return {
          id: `c${Date.now()}`,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          author_id: input.author_id,
          author,
          content: trimmed,
          parent_id: input.parent_id ?? undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      const { data, error } = await supabase
        .from('comments')
        .insert({
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          author_id: input.author_id,
          content: trimmed,
          parent_id: input.parent_id ?? null,
          updated_at: new Date().toISOString(),
        })
        .select(
          '*, author:users(id, full_name, avatar_url, email, role, status, joined_at, created_at, updated_at)'
        )
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error('Comment was saved but could not be retrieved');
      return data as unknown as Comment;
    },
    onSuccess: (comment) => {
      qc.invalidateQueries({
        queryKey: QUERY_KEYS.comments(comment.entity_type, comment.entity_id),
      });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
    },
    onError: (err: Error) => toast.error('Failed to post comment', err.message),
  });
}

