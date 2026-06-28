import { supabase } from '../supabase';
import type { ServiceType } from '../types';

/**
 * Reads from `completion_ledger` for a specific provider on a given UTC day.
 * Returns the real net payout and the count of completed jobs.
 * Used by the Provider Today screen KPI strip.
 *
 * `net_cents` is the captured net (gross − the real platform fee, which is 10% on
 * subscriptions but 17.5% on one-offs). Older rows predating that column fall back to
 * the flat 90% estimate.
 */
export async function fetchProviderTodayCompletions(
  providerId: string,
  todayStart: string, // ISO start of today UTC
  todayEnd: string,   // ISO end of today UTC
): Promise<{ netCents: number; jobsDone: number }> {
  const { data, error } = await supabase
    .from('completion_ledger')
    .select('amount_cents, net_cents')
    .eq('provider_id', providerId)
    .gte('completed_at', todayStart)
    .lt('completed_at', todayEnd);
  if (error) throw error;
  const rows = (data ?? []) as { amount_cents: number; net_cents: number | null }[];
  const net = rows.reduce(
    (sum, r) => sum + (r.net_cents ?? Math.round((r.amount_cents ?? 0) * 0.9)),
    0,
  );
  return { netCents: net, jobsDone: rows.length };
}

/** One completed, paid-out job recorded in the completion ledger (the data flywheel). */
export interface CompletionRow {
  id: string;
  serviceType: ServiceType;
  completedAt: string; // ISO
  amountCents: number;
}

/**
 * Reads the homeowner's completion ledger — the source of truth for "services
 * completed" and for deriving maintenance cadence. RLS scopes rows to the caller.
 */
export async function fetchHomeownerCompletions(homeownerId: string): Promise<CompletionRow[]> {
  const { data, error } = await supabase
    .from('completion_ledger')
    .select('id, service_type, completed_at, amount_cents')
    .eq('homeowner_id', homeownerId)
    .order('completed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      serviceType: r.service_type as ServiceType,
      completedAt: r.completed_at as string,
      amountCents: (r.amount_cents as number | null) ?? 0,
    };
  });
}
