import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, setHasSupabaseSession } from '../lib/supabase';
import { fetchPrimaryAddress } from '../lib/api/addresses';
import { useProviderOnboardingStore } from './providerOnboardingStore';
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
  lat?: number | null;
  lng?: number | null;
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
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  resendEmailOtp: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setOnboardingComplete: (done: boolean) => void;
  setPendingHomeownerSetup: (s: PendingHomeownerSetup | null) => void;
  flushPendingHomeownerSetup: (userId?: string) => Promise<{ error: Error | null }>;
}

let authSubscription: { unsubscribe: () => void } | null = null;
let flushInFlight = false;
let signOutInFlight = false;

const VALID_SERVICE_TYPES = [
  'lawn',
  'cleaning',
  'pool',
  'pest',
  'pressure',
  'window',
  'gutter',
  'detailing',
  'tree',
  'solar',
];

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

async function fetchProviderOnboarding(
  userId: string,
): Promise<{ id: string; onboardingComplete: boolean } | null> {
  const { data } = await supabase
    .from('providers')
    .select('id, onboarding_completed_at')
    .eq('owner_user_id', userId)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, onboardingComplete: !!data.onboarding_completed_at };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const applySession = async (session: Session | null) => {
        // Drive the native auto-refresh timer from real auth state — never let it
        // run (and fire token refreshes) without a session. See setHasSupabaseSession.
        setHasSupabaseSession(!!session);
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
        try {
          const profile = await fetchProfile(session.user.id);

          // Derive onboarding completion from the DB (the source of truth), not the
          // locally-persisted flag — otherwise a refresh, or a sign-in on a fresh
          // device/browser/cleared storage, strands an already-onboarded user back in
          // onboarding (homeowner → address-setup, provider → onboarding/welcome).
          let providerId: string | null = null;
          let onboardingComplete = get().onboardingComplete;
          if (profile?.role === 'homeowner') {
            const pending = get().pendingHomeownerSetup;
            if (pending && pending.serviceInterests !== undefined) {
              // A fully-completed setup was saved before this session arrived (e.g. a
              // link-confirmation flow). Persist it now — never flush partial data, which
              // would drop the user's service interests and clear pending mid-wizard.
              await get().flushPendingHomeownerSetup(session.user.id);
              onboardingComplete = get().onboardingComplete;
            } else {
              const primaryAddress = await fetchPrimaryAddress(session.user.id);
              onboardingComplete = !!primaryAddress;
            }
          } else if (profile?.role === 'provider_owner') {
            const provider = await fetchProviderOnboarding(session.user.id);
            providerId = provider?.id ?? null;
            onboardingComplete = provider?.onboardingComplete ?? false;
          }

          set({
            session,
            user: session.user,
            profile,
            role: profile?.role ?? null,
            providerId,
            onboardingComplete,
            status: 'authenticated',
          });
        } catch {
          // Enrichment (profile/address/provider queries) failed transiently. Never strand
          // the user on a blank/unauthenticated screen — mark authenticated from session
          // presence and keep last-known role/onboarding from persisted state.
          set({ session, user: session.user, status: 'authenticated' });
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

          // Safety net: never let a hung network keep status on 'bootstrapping'
          // (splash never exits / app stuck on reload). Resolve to a sane state
          // from persisted role after a bounded wait.
          const bootTimeout = setTimeout(() => {
            if (get().status === 'bootstrapping') {
              const { session, user } = get();
              set({ status: session && user ? 'authenticated' : 'unauthenticated' });
            }
          }, 8000);

          try {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            if (data.session) {
              await applySession(data.session);
            } else {
              setHasSupabaseSession(false);
              set({ status: 'unauthenticated' });
            }
          } catch {
            // A stored session whose refresh token the server rejects (e.g. a token
            // minted by a since-rebuilt Supabase project → "Invalid Refresh Token:
            // Refresh Token Not Found"). Purge it locally so it can't fail again on
            // every subsequent boot, then land cleanly on the unauthenticated screen.
            try {
              await supabase.auth.signOut({ scope: 'local' });
            } catch {
              // best-effort purge — fall through to unauthenticated regardless
            }
            setHasSupabaseSession(false);
            set({ status: 'unauthenticated' });
          } finally {
            clearTimeout(bootTimeout);
          }
        },

        refreshProfile: async () => {
          const { user } = get();
          if (!user) return;
          const profile = await fetchProfile(user.id);
          set({ profile, role: profile?.role ?? null });
        },

        signIn: async (email, password) => {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) return { error };
          // Apply the session synchronously before returning so the caller can navigate
          // immediately without racing the async onAuthStateChange listener — otherwise
          // status is still 'unauthenticated' when index.tsx evaluates and redirects to
          // welcome (and never recovers, since welcome doesn't re-route on auth change).
          if (data.session) await applySession(data.session);
          return { error: null };
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
          if (error) return { error, needsEmailConfirmation: false };

          // Confirmations OFF → signUp returns a session; apply it before the caller
          // navigates (same race as signIn).
          if (data.session) {
            await applySession(data.session);
            return { error: null, needsEmailConfirmation: false };
          }

          // Confirmations ON. Supabase obfuscates a re-signup of an existing email by
          // returning an empty `identities` array (anti-enumeration) and does NOT send a
          // fresh code — which strands an abandoned, unconfirmed account (it can never
          // re-verify). Detect that case and explicitly resend the signup code.
          const isExistingEmail = !!data.user && (data.user.identities?.length ?? 0) === 0;
          if (isExistingEmail) {
            const { error: resendErr } = await supabase.auth.resend({ type: 'signup', email });
            // A fully-confirmed account can't be issued a signup code → it truly exists.
            // Do NOT treat rate-limit errors as "already registered": a rate-limited
            // resend can't distinguish a confirmed account from an unconfirmed/abandoned
            // one, and routing the latter to sign-in strands it. Rate-limited → verify.
            if (resendErr && /confirm|registered|already/i.test(resendErr.message)) {
              return {
                error: new Error('This email is already registered. Please sign in instead.'),
                needsEmailConfirmation: false,
              };
            }
            // Otherwise (resent OK, or rate-limited with a code already in flight) → verify.
          }
          return { error: null, needsEmailConfirmation: true };
        },

        verifyEmailOtp: async (email, token) => {
          const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
          if (error) return { error };
          // Apply the session here so the verify screen navigates into the app with
          // user/role/onboarding state already populated (same race as signIn).
          if (data.session) await applySession(data.session);
          return { error: null };
        },

        resendEmailOtp: async (email) => {
          const { error } = await supabase.auth.resend({ type: 'signup', email });
          return { error };
        },

        signOut: async () => {
          if (signOutInFlight) return;
          signOutInFlight = true;
          try {
            await supabase.auth.signOut();
          } catch {
            // ignore — we still want to clear local state below
          } finally {
            signOutInFlight = false;
          }
          // Keep the onAuthStateChange listener alive across sign-out — it's a
          // process-lifetime singleton (bootstrap only attaches it once), and tearing it
          // down here meant token refresh and the next sign-in stopped updating state.
          setHasSupabaseSession(false);
          useProviderOnboardingStore.getState().reset();
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

        flushPendingHomeownerSetup: async (userIdArg?: string) => {
          const { user, pendingHomeownerSetup } = get();
          // During applySession the flush runs BEFORE `user` is set in the store, so
          // fall back to the id passed by the caller — otherwise the flush silently
          // no-ops and the homeowner's saved address/interests are lost.
          const uid = userIdArg ?? user?.id;
          if (!uid || !pendingHomeownerSetup) return { error: null };
          if (flushInFlight) return { error: null };
          flushInFlight = true;
          try {
            const { street, city, state, zip, neighborhood, lat, lng, serviceInterests } =
              pendingHomeownerSetup;

            const { data: existing, error: existingErr } = await supabase
              .from('addresses')
              .select('id')
              .eq('profile_id', uid)
              .eq('is_primary', true)
              .limit(1)
              .maybeSingle();
            if (existingErr) {
              // RLS or transient — keep pending so we can retry.
              return { error: existingErr };
            }

            let addressId = existing?.id ?? null;
            if (!addressId) {
              const { data: addr, error: addrErr } = await supabase
                .from('addresses')
                .insert({
                  profile_id: uid,
                  street,
                  city,
                  state,
                  zip,
                  neighborhood: neighborhood ?? null,
                  lat: lat ?? null,
                  lng: lng ?? null,
                  is_primary: true,
                })
                .select('id')
                .single();
              if (addrErr) {
                // RLS or duplicate — keep pending so we can retry.
                return { error: addrErr };
              }
              addressId = addr.id;
            }

            const serviceInterestsValues = (serviceInterests ?? []).filter((s) =>
              VALID_SERVICE_TYPES.includes(s),
            );

            const { error: hwErr } = await supabase
              .from('homeowners')
              .upsert(
                {
                  id: uid,
                  primary_address_id: addressId,
                  service_interests:
                    serviceInterestsValues.length > 0 ? serviceInterestsValues : null,
                },
                { onConflict: 'id' }
              );
            if (hwErr) {
              // Keep pending setup so the next authenticated session retries —
              // do NOT mark onboarding complete when the homeowner row failed.
              return { error: hwErr };
            }

            set({ pendingHomeownerSetup: null, onboardingComplete: true });
            return { error: null };
          } finally {
            flushInFlight = false;
          }
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
