import { supabase, isSupabaseConfigured } from './supabase';
import { useAuthStore } from '../store/authStore';

export type NotifyStakeholderEntity = 'project' | 'task' | 'issue' | 'sprint';

/**
 * When an **admin** updates project-scoped data, notify the project lead,
 * all project members, and any extra users (e.g. task assignees).
 * Implemented via SECURITY DEFINER RPC (RLS blocks cross-user inserts).
 */
export async function notifyProjectStakeholdersAdminAction(input: {
  projectId: string;
  type: string;
  title: string;
  message: string;
  entityType?: NotifyStakeholderEntity | string | null;
  entityId?: string | null;
  extraUserIds?: string[] | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const actor = useAuthStore.getState().user;
  if (!actor || actor.role !== 'admin') return;

  const extras = (input.extraUserIds ?? []).filter(Boolean);
  const { error } = await supabase.rpc('notify_project_stakeholders', {
    p_project_id: input.projectId,
    p_type: input.type,
    p_title: input.title,
    p_message: input.message,
    p_entity_type: input.entityType ?? null,
    p_entity_id: input.entityId ?? null,
    p_extra_user_ids: extras.length ? extras : null,
  });

  if (error) {
    console.warn('[notify_project_stakeholders]', error.message);
  }
}
