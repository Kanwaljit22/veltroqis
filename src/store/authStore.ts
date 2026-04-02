import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  initialize: () => Promise<void>;
}

/** Build a User object from a Supabase session when the DB profile isn't available yet */
function userFromSession(session: Session): User {
  const meta = session.user.user_metadata ?? {};
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    full_name: (meta.full_name as string) || (meta.name as string) || session.user.email?.split('@')[0] || 'User',
    avatar_url: (meta.avatar_url as string) || (meta.picture as string) || undefined,
    role: 'developer',
    status: 'active',
    joined_at: session.user.created_at,
    created_at: session.user.created_at,
    updated_at: session.user.updated_at ?? session.user.created_at,
  };
}

/** Try to load the DB profile; fall back to session-based user silently */
async function fetchProfile(session: Session): Promise<User> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    if (!error && data) return data as User;
  } catch {
    // table may not exist yet — fall back to auth metadata
  }
  return userFromSession(session);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      error: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            const user = await fetchProfile(session);
            set({ user, isAuthenticated: true, loading: false });
          } else {
            set({ user: null, isAuthenticated: false, loading: false });
          }
        } catch (err) {
          console.error('[Auth] initialize error:', err);
          set({ loading: false });
        }

        supabase.auth.onAuthStateChange((event, session) => {
          if (
            (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
            session
          ) {
            fetchProfile(session)
              .then((user) => set({ user, isAuthenticated: true }))
              .catch((err) =>
                console.warn('[Auth] onAuthStateChange fetchProfile error:', err)
              );
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, isAuthenticated: false });
          }
        });
      },

      signIn: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;

          if (data.session) {
            const user = await fetchProfile(data.session);
            set({ user, isAuthenticated: true, loading: false });
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Sign in failed';
          set({ error: message, loading: false });
          throw err;
        }
        set({ loading: false });
      },

      signInWithGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/dashboard`,
            queryParams: { access_type: 'offline', prompt: 'consent' },
          },
        });
        if (error) throw error;
      },

      signUp: async (email, password, fullName, role) => {
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName, ...(role ? { role } : {}) },
              emailRedirectTo: `${window.location.origin}/dashboard`,
            },
          });
          if (error) throw error;

          if (data.session) {
            const user = await fetchProfile(data.session);
            set({ user, isAuthenticated: true, loading: false });
          } else {
            set({ loading: false });
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Sign up failed';
          set({ error: message, loading: false });
          throw err;
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
      },

      forgotPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
      },

      resetPassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      },

      updateProfile: async (updates) => {
        const { user } = get();
        if (!user) return;

        const {
          role: _role,
          status: _status,
          email: _email,
          joined_at: _joined_at,
          created_at: _created_at,
          updated_at: _updated_at,
          id: _id,
          ...safeUpdates
        } = updates;

        const { error } = await supabase
          .from('users')
          .update({ ...safeUpdates, updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (error) throw new Error(`[profile.update] ${error.message} (code: ${error.code})`);
        set({ user: { ...user, ...safeUpdates } });
      },
    }),
    {
      name: 'veltroqis-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
