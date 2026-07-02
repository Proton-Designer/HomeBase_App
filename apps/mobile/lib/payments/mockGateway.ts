import { invokeFn } from '../api/functions';

/**
 * Payments mode. While true, all money operations route to the fake `mock-payments`
 * Edge Function (no Stripe, no real charges/payouts).
 *
 * Env-gated so production can switch to real Stripe WITHOUT a code change: set
 * `EXPO_PUBLIC_MOCK_PAYMENTS=false` (and implement the real path in lib/api/payments.ts).
 * Defaults to mock (true) when the var is unset, so dev/test behaviour is unchanged.
 */
export const MOCK_PAYMENTS = process.env.EXPO_PUBLIC_MOCK_PAYMENTS !== 'false';

/**
 * Call the `mock-payments` Edge Function. Delegates to `invokeFn`, which does a direct
 * fetch with both a fetch-abort timeout and a bounded getSession() — so the money path
 * can't hang on a stalled auth lock (see lib/api/functions.ts).
 */
export function callMock<T>(op: string, body: Record<string, unknown> = {}): Promise<T> {
  return invokeFn<T>('mock-payments', { op, ...body });
}
