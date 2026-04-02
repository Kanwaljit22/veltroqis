import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Veltroqis] Supabase credentials not found in .env.local — running in mock data mode.'
  );
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'veltroqis-auth-token',
    },
  }
);

/**
 * Set to `true` to force mock/demo data regardless of Supabase credentials.
 * Defaults to `false` (live backend) when credentials are present.
 */
export const DEMO_MODE = (import.meta.env.VITE_DEMO_MODE as string | undefined) === 'true';

/** Returns true when real Supabase credentials are configured AND demo mode is off */
export const isSupabaseConfigured = () =>
  !DEMO_MODE &&
  !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

/**
 * Returns true when a Supabase/PostgREST error indicates the table or column
 * does not exist yet (schema has not been applied).  In this case callers
 * should return empty data rather than surfacing a hard error to the user.
 */
export const isSchemaError = (error: { message?: string; code?: string } | null): boolean => {
  if (!error) return false;
  const msg = error.message ?? '';
  return (
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    error.code === '42P01' // PostgreSQL undefined_table
  );
};

/**
 * Returns true when PostgREST responds with HTTP 406 because `.single()` was
 * called but the query matched 0 rows (PGRST116).
 * Callers should use `.maybeSingle()` to avoid this error entirely; this
 * helper is provided as a belt-and-suspenders fallback.
 */
export const isNotFoundError = (error: { message?: string; code?: string } | null): boolean => {
  if (!error) return false;
  return (
    error.code === 'PGRST116' ||
    (error.message ?? '').includes('rows returned')
  );
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

export const getAvatarUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
};

export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar.${fileExt}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });
  if (error) throw error;
  return filePath;
};

export const uploadAttachment = async (
  entityType: string,
  entityId: string,
  file: File
): Promise<{ filePath: string; publicUrl: string }> => {
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `${entityType}/${entityId}/${fileName}`;
  const { error } = await supabase.storage.from('attachments').upload(filePath, file);
  if (error) throw error;
  const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
  return { filePath, publicUrl: data.publicUrl };
};

/** Readable URL for sprint-goal images (private bucket → time-limited signed URL). */
export const getAttachmentSignedUrl = async (filePath: string, expiresIn = 31536000) => {
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(filePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
};

const readFileAsDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('Could not read file'));
    r.readAsDataURL(file);
  });

/**
 * Uploads an image for rich-text sprint goals under `attachments/sprint-goals/{projectId}/`.
 * Mock mode embeds a data URL. Live mode returns a long-lived signed URL for <img src>.
 */
export const uploadSprintGoalImage = async (projectId: string, file: File): Promise<string> => {
  if (!isSupabaseConfigured()) {
    return readFileAsDataURL(file);
  }
  const { filePath } = await uploadAttachment('sprint-goals', projectId, file);
  return getAttachmentSignedUrl(filePath);
};

// ─── Realtime helpers ─────────────────────────────────────────────────────────

export const subscribeToNotifications = (
  userId: string,
  onNotification: (payload: Record<string, unknown>) => void
) => {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onNotification(payload.new as Record<string, unknown>)
    )
    .subscribe();
};

export const subscribeToTasks = (
  projectId: string,
  onUpdate: (payload: Record<string, unknown>) => void
) => {
  return supabase
    .channel(`tasks:${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => onUpdate(payload as Record<string, unknown>)
    )
    .subscribe();
};
