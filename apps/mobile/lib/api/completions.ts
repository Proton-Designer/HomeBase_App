import { supabase } from '../supabase';
import type { ServiceType } from '../types';

/**
 * Net payout for a completion_ledger row: the stored captured net (gross − the real
 * platform fee, 10% subscription / 17.5% one-off), or a flat 90% estimate for legacy
 * rows written before `net_cents` was populated.
 */
export function netFromLedgerRow(row: {
  amount_cents: number | null;
  net_cents: number | null;
}): number {
  return row.net_cents ?? Math.round((row.amount_cents ?? 0) * 0.9);
}

/**
 * Reads from `completion_ledger` for a specific provider on a given UTC day.
 * Returns the real net payout and the count of completed jobs.
 * Used by the Provider Today screen KPI strip.
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
  const net = rows.reduce((sum, r) => sum + netFromLedgerRow(r), 0);
  return { netCents: net, jobsDone: rows.length };
}

/** One row for the provider Earnings screen history list. */
export interface ProviderEarningsRow {
  id: string;
  date: string; // ISO
  service: string;
  homeownerFirst: string;
  netCents: number;
}

/**
 * Reads the provider's recent completion ledger for the Earnings screen (latest 50),
 * resolving each homeowner's first name and the real net payout.
 */
export async function fetchProviderEarnings(providerId: string): Promise<ProviderEarningsRow[]> {
  const { data, error } = await supabase
    .from('completion_ledger')
    .select(
      'id, created_at, service_type, amount_cents, net_cents, jobs(profiles!jobs_homeowner_id_fkey(first_name))',
    )
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const profile = (row.jobs as Record<string, unknown> | null)?.profiles as
      | { first_name?: string }
      | null;
    return {
      id: row.id as string,
      date: row.created_at as string,
      service: row.service_type as string,
      homeownerFirst: profile?.first_name ?? 'Customer',
      netCents: netFromLedgerRow(row as { amount_cents: number | null; net_cents: number | null }),
    };
  });
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
