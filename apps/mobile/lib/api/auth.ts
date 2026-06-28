import { supabase } from '../supabase';

export async function signUp(email: string, password: string, role: 'homeowner' | 'provider_owner' | 'provider_tech') {
  return supabase.auth.signUp({ email, password, options: { data: { role } } });
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: 'homebase://auth/callback' },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  return supabase.auth.getSession();
}
