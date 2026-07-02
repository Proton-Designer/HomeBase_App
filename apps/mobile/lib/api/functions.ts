import { supabase } from '../supabase';

/**
 * Invoke a Supabase Edge Function via a direct `fetch` instead of
 * `supabase.functions.invoke`. The invoke helper can leave its promise unsettled in
 * React Native for authenticated functions — the request reaches the server (the work
 * happens) but the client never resolves, hanging the caller forever. `fetch().json()`
 * resolves reliably; an `AbortController` timeout turns any stall into a thrown error.
 *
 * Returns the parsed JSON body; throws on non-2xx (using the body's `error` if present).
 */
export async function invokeFn<T = unknown>(
  name: string,
  body: object = {},
  opts: { timeoutMs?: number } = {},
): Promise<T> {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/${name}`;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  // getSession() acquires supabase-js's auth lock; a stalled background refresh can hang
  // it indefinitely (the AbortController below only covers the fetch). Bound it and
  // degrade to an anon call on timeout instead of leaving the caller spinning forever.
  const session = await Promise.race([
    supabase.auth.getSession().then((r) => r.data.session),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
  ]);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${session?.access_token ?? anonKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok) {
      throw new Error((json as { error?: string } | null)?.error ?? `${name} failed (${res.status})`);
    }
    return json as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out — please check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
