import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton — created on first access so module evaluation never throws.
// The service-role key must be set; missing it throws at query time (not
// module load time), surfacing a clear error on the first real call.
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!serviceKey) {
    throw new Error(
      'Missing env var: SUPABASE_SERVICE_ROLE_KEY — set it in .env.local or Vercel dashboard. Never expose it to the client.'
    );
  }

  _client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return _client;
}

// Proxy every property access through the lazy getter so callers can write
// `supabaseAdmin.from(...)` without any change at the call site.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
