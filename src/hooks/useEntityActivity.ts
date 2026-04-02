import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured, isSchemaError } from '../lib/supabase';
import { QUERY_KEYS } from '../lib/queryKeys';
import { MOCK_ACTIVITY_LOGS } from '../lib/mockData';
import type { ActivityLog } from '../types';

export function useEntityActivity(
  entityType: string,
  entityId: string,
  limit = 10
) {
  return useQuery({
    queryKey: QUERY_KEYS.entityActivity(entityType, entityId, limit),
    queryFn: async (): Promise<ActivityLog[]> => {
      if (!entityId) return [];

      if (!isSupabaseConfigured()) {
        return MOCK_ACTIVITY_LOGS.filter((a) => a.entity_id === entityId).slice(
          0,
          limit
        );
      }

      const { data, error } = await supabase
        .from('activity_logs')
        .select(
          '*, user:users(id, full_name, avatar_url, email, role, status, joined_at, created_at, updated_at)'
        )
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (isSchemaError(error)) return [];
        throw new Error(error.message);
      }
      return (data ?? []) as unknown as ActivityLog[];
    },
    enabled: !!entityId,
    staleTime: 15_000,
  });
}

