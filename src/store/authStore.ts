import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_USERS } from '../lib/mockData';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  useMockData: boolean;
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
    // .maybeSingle() returns null (not a 406) when no row exists yet,
    // which happens for brand-new accounts before the DB trigger fires.
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
      useMockData: !isSupabaseConfigured(),

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      initialize: async () => {
        if (!isSupabaseConfigured()) {
          set({ loading: false, useMockData: true });
          return;
        }

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

        // Keep session in sync across tabs and after token refresh.
        // The callback is intentionally NOT async — we use .then/.catch to
        // prevent an unhandled-rejection when fetchProfile can't reach the DB.
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
          if (!isSupabaseConfigured()) {
            // Mock mode — any credentials work
            const mockUser =
              MOCK_USERS.find((u) => u.email === email) ?? MOCK_USERS[0];
            set({ user: mockUser, isAuthenticated: true, loading: false });
            return;
          }

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;

          // Set authenticated immediately — don't wait for onAuthStateChange
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
        if (!isSupabaseConfigured()) {
          set({ user: MOCK_USERS[0], isAuthenticated: true });
          return;
        }
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
          if (!isSupabaseConfigured()) {
            const newUser: User = {
              id: Date.now().toString(),
              email,
              full_name: fullName,
              role: 'developer',
              status: 'active',
              joined_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            set({ user: newUser, isAuthenticated: true, loading: false });
            return;
          }

          // The `role` value is embedded in user_metadata and read by the
          // handle_new_user DB trigger.  The trigger caps it to non-admin roles,
          // so passing 'admin' here is intentionally ignored by the DB.
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName, ...(role ? { role } : {}) },
              emailRedirectTo: `${window.location.origin}/dashboard`,
            },
          });
          if (error) throw error;

          // If email confirmation is disabled, session is returned immediately
          if (data.session) {
            const user = await fetchProfile(data.session);
            set({ user, isAuthenticated: true, loading: false });
          } else {
            // Email confirmation required — user needs to check inbox
            set({ loading: false });
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Sign up failed';
          set({ error: message, loading: false });
          throw err;
        }
      },

      signOut: async () => {
        if (!isSupabaseConfigured()) {
          set({ user: null, isAuthenticated: false });
          return;
        }
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
      },

      forgotPassword: async (email) => {
        if (!isSupabaseConfigured()) return;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
      },

      resetPassword: async (password) => {
        if (!isSupabaseConfigured()) return;
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      },

      updateProfile: async (updates) => {
        const { user } = get();
        if (!user) return;

        if (!isSupabaseConfigured()) {
          set({ user: { ...user, ...updates } });
          return;
        }

        // Only send columns that exist in the DB and belong to the user's own
        // profile.  Role/status changes go through useChangeUserRole / useUpdateUser
        // (which require admin privileges) so we never send those here.
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
        useMockData: state.useMockData,
      }),
    }
  )
);
