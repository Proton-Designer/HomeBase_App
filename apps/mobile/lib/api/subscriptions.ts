import { supabase } from '../supabase';
import type { Subscription, Frequency, ServiceType, SubscriptionStatus } from '../types';

export async function listForHomeowner(homeownerId: string): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, homeowner_id, provider_id, service_type, frequency, status, monthly_estimate_cents, next_date, paused_at, resumed_at, cancelled_at, cancellation_reason, created_at, providers(display_name, avatar_url, composite_score_overall, verification_tier)')
    .eq('homeowner_id', homeownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const provider =
      (row.providers as {
        display_name?: string;
        avatar_url?: string;
        composite_score_overall?: number | null;
        verification_tier?: number;
      } | null) ?? null;
    return {
      id: row.id as string,
      homeownerId: row.homeowner_id as string,
      providerId: row.provider_id as string,
      providerName: provider?.display_name ?? 'Provider',
      providerAvatarUrl: provider?.avatar_url ?? null,
      providerTrustScore: provider?.composite_score_overall ?? null,
      providerVerificationTier: (provider?.verification_tier ?? 0) as Subscription['providerVerificationTier'],
      serviceType: row.service_type as ServiceType,
      frequency: row.frequency as Frequency,
      status: row.status as SubscriptionStatus,
      monthlyEstimateCents: row.monthly_estimate_cents as number,
      nextDate: (row.next_date as string | null) ?? null,
      pausedAt: (row.paused_at as string | null) ?? null,
      resumedAt: (row.resumed_at as string | null) ?? null,
      cancelledAt: (row.cancelled_at as string | null) ?? null,
      cancellationReason: (row.cancellation_reason as string | null) ?? null,
      createdAt: row.created_at as string,
    };
  });
}

export async function get(id: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, providers(display_name, avatar_url, composite_score_overall, verification_tier)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const provider =
    (data.providers as {
      display_name?: string;
      avatar_url?: string;
      composite_score_overall?: number | null;
      verification_tier?: number;
    } | null) ?? null;
  return {
    id: data.id,
    homeownerId: data.homeowner_id,
    providerId: data.provider_id,
    providerName: provider?.display_name ?? 'Provider',
    providerAvatarUrl: provider?.avatar_url ?? null,
    providerTrustScore: provider?.composite_score_overall ?? null,
    providerVerificationTier: (provider?.verification_tier ?? 0) as Subscription['providerVerificationTier'],
    serviceType: data.service_type,
    frequency: data.frequency,
    status: data.status,
    monthlyEstimateCents: data.monthly_estimate_cents,
    nextDate: data.next_date,
    pausedAt: data.paused_at,
    resumedAt: data.resumed_at,
    cancelledAt: data.cancelled_at,
    cancellationReason: data.cancellation_reason,
    createdAt: data.created_at,
  };
}

export async function pause(id: string): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'paused', paused_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function resume(id: string): Promise<void> {
  const patch: Record<string, unknown> = {
    status: 'active',
    resumed_at: new Date().toISOString(),
  };
  // If the subscription was paused past its scheduled next visit, advance next_date so a
  // resumed sub never shows a stale/past date. Preserve a still-future next_date.
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('frequency, next_date')
    .eq('id', id)
    .maybeSingle();
  const today = new Date().toISOString().slice(0, 10);
  if (sub && (!sub.next_date || (sub.next_date as string) < today)) {
    const next = new Date();
    next.setDate(next.getDate() + FREQUENCY_INTERVAL_DAYS[sub.frequency as Frequency]);
    patch.next_date = next.toISOString().slice(0, 10);
  }
  const { error } = await supabase.from('subscriptions').update(patch).eq('id', id);
  if (error) throw error;
}

export async function cancel(id: string, reason?: string): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason ?? null,
    })
    .eq('id', id);
  if (error) throw error;
}

const FREQUENCY_INTERVAL_DAYS: Record<Frequency, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 91,
  semi_annual: 182,
};

export async function changeFrequency(
  id: string,
  frequency: Frequency,
  monthlyEstimateCents?: number,
): Promise<void> {
  // Persist the recomputed monthly estimate (the caller derives it from per-visit price)
  // and advance next_date to one cadence interval out — otherwise the new frequency
  // shows a stale price and a next date that no longer matches the cadence.
  const next = new Date();
  next.setDate(next.getDate() + FREQUENCY_INTERVAL_DAYS[frequency]);
  const patch: Record<string, unknown> = {
    frequency,
    next_date: next.toISOString().slice(0, 10),
  };
  if (monthlyEstimateCents != null) patch.monthly_estimate_cents = monthlyEstimateCents;
  const { error } = await supabase.from('subscriptions').update(patch).eq('id', id);
  if (error) throw error;
}
