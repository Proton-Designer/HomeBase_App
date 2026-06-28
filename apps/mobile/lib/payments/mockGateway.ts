import { supabase } from '../supabase';

/**
 * Payments mode. While true, all money operations route to the fake
 * `mock-payments` Edge Function (no Stripe, no real charges/payouts) instead of the
 * real `stripe-*` functions.
 *
 * Env-gated so production can switch to real Stripe WITHOUT a code change: set
 * `EXPO_PUBLIC_MOCK_PAYMENTS=false` (and provision Stripe keys) to go live.
 * Defaults to mock (true) when the var is unset, so dev/test behaviour is unchanged.
 */
export const MOCK_PAYMENTS = process.env.EXPO_PUBLIC_MOCK_PAYMENTS !== 'false';

/**
 * Calls the mock-payments function via a direct fetch (not `supabase.functions.invoke`,
 * which can hang for authenticated functions in React Native) with an abort timeout.
 */
export async function callMock<T>(op: string, body: Record<string, unknown> = {}): Promise<T> {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mock-payments`;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${session?.access_token ?? anonKey}`,
      },
      body: JSON.stringify({ op, ...body }),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok) throw new Error(json?.error ?? `Payment step failed (${res.status})`);
    return json as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Payment step timed out — please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
