import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../lib/types';

export interface AuthProfile {
  id: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
}

type AuthStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

export interface PendingHomeownerSetup {
  street: string;
  city: string;
  state: string;
  zip: string;
  neighborhood?: string | null;
  serviceInterests?: string[];
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  role: UserRole | null;
  providerId: string | null;
  onboardingComplete: boolean;
  status: AuthStatus;
  pendingHomeownerSetup: PendingHomeownerSetup | null;

  bootstrap: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (input: {
    email: string;
    password: string;
    role: UserRole;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  setOnboardingComplete: (done: boolean) => void;
  setPendingHomeownerSetup: (s: PendingHomeownerSetup | null) => void;
  flushPendingHomeownerSetup: () => Promise<void>;
}

let authSubscription: { unsubscribe: () => void } | null = null;

async function fetchProfile(userId: string): Promise<AuthProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, first_name, last_name, email, phone, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    role: data.role,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    avatarUrl: data.avatar_url,
  };
}

async function fetchProviderId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('providers')
    .select('id')
    .eq('owner_user_id', userId)
    .maybeSingle();
  return data?.id ?? null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const applySession = async (session: Session | null) => {
        if (!session) {
          set({
            session: null,
            user: null,
            profile: null,
            role: null,
            providerId: null,
            status: 'unauthenticated',
          });
          return;
        }
        const profile = await fetchProfile(session.user.id);
        const providerId =
          profile?.role === 'provider_owner' ? await fetchProviderId(session.user.id) : null;
        set({
          session,
          user: session.user,
          profile,
          role: profile?.role ?? null,
          providerId,
          status: 'authenticated',
        });
        // Flush any pending setup the user submitted before email confirmation.
        const pending = get().pendingHomeownerSetup;
        if (pending && profile?.role === 'homeowner') {
          await get().flushPendingHomeownerSetup();
        }
      };

      return {
        session: null,
        user: null,
        profile: null,
        role: null,
        providerId: null,
        onboardingComplete: false,
        status: 'bootstrapping',
        pendingHomeownerSetup: null,

        bootstrap: async () => {
          if (authSubscription) return;
          const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
            await applySession(session);
          });
          authSubscription = sub.subscription;

          try {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              await applySession(data.session);
            } else {
              set({ status: 'unauthenticated' });
            }
          } catch {
            set({ status: 'unauthenticated' });
          }
        },

        refreshProfile: async () => {
          const { user } = get();
          if (!user) return;
          const profile = await fetchProfile(user.id);
          set({ profile, role: profile?.role ?? null });
        },

        signIn: async (email, password) => {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          return { error };
        },

        signUp: async ({ email, password, role, firstName, lastName, phone }) => {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                role,
                first_name: firstName ?? null,
                last_name: lastName ?? null,
                phone: phone ?? null,
              },
            },
          });
          // If Supabase email confirmations are ON, signUp returns user but no session.
          const needsEmailConfirmation = !error && !!data.user && !data.session;
          return { error, needsEmailConfirmation };
        },

        signOut: async () => {
          try {
            await supabase.auth.signOut();
          } catch {
            // ignore — we still want to clear local state below
          }
          set({
            session: null,
            user: null,
            profile: null,
            role: null,
            providerId: null,
            status: 'unauthenticated',
            pendingHomeownerSetup: null,
            onboardingComplete: false,
          });
        },

        setOnboardingComplete: (done) => set({ onboardingComplete: done }),
        setPendingHomeownerSetup: (s) => set({ pendingHomeownerSetup: s }),

        flushPendingHomeownerSetup: async () => {
          const { user, pendingHomeownerSetup } = get();
          if (!user || !pendingHomeownerSetup) return;
          const { street, city, state, zip, neighborhood } = pendingHomeownerSetup;

          const { data: addr, error: addrErr } = await supabase
            .from('addresses')
            .insert({
              profile_id: user.id,
              street,
              city,
              state,
              zip,
              neighborhood: neighborhood ?? null,
              is_primary: true,
            })
            .select('id')
            .single();
          if (addrErr) {
            // RLS or duplicate — keep pending so we can retry.
            return;
          }

          await supabase
            .from('homeowners')
            .upsert(
              { id: user.id, primary_address_id: addr.id },
              { onConflict: 'id' }
            );

          set({ pendingHomeownerSetup: null, onboardingComplete: true });
        },
      };
    },
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        role: state.role,
        providerId: state.providerId,
        onboardingComplete: state.onboardingComplete,
        pendingHomeownerSetup: state.pendingHomeownerSetup,
      }),
    }
  )
);
