import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from './supabase-server';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore.
          }
        },
      },
    }
  );
}

export async function getAdminSession(): Promise<{
  user: { id: string; email?: string };
  profile: { id: string; role: string | null; email: string | null; first_name: string | null; last_name: string | null };
} | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, role, email, first_name, last_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') return null;

  return { user, profile };
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect('/sign-in');
  return session;
}
