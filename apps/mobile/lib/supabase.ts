import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fail loud at startup rather than silently running against a placeholder and
// surfacing every request as a vague network error.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env, then restart Metro with --clear.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// On React Native, `autoRefreshToken` alone does NOT keep the JWT alive — the
// timer must be driven by AppState, or the access token silently expires (~1 hr)
// and every authed request 401s (dead buttons, failed first-try uploads, blank
// screens, stuck reloads). Web refreshes fine on its own timers.
//
// CRITICAL: only run the refresh timer once we actually hold a valid session.
// Firing it at module load — before bootstrap validates what's in storage —
// makes it refresh whatever stale token is persisted. After a project rebuild
// that token belongs to the *old* project and the new one rejects it with
// "Invalid Refresh Token: Refresh Token Not Found". The auth store calls
// `setHasSupabaseSession()` from applySession so the timer tracks real auth state.
let hasSession = false;

export function setHasSupabaseSession(value: boolean) {
  if (Platform.OS === 'web') return;
  hasSession = value;
  if (value && AppState.currentState === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
}

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active' && hasSession) {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
