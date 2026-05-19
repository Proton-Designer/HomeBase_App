import { supabase } from '../supabase';
import type { Subscription, Frequency, ServiceType, SubscriptionStatus } from '../types';

export async function listForHomeowner(homeownerId: string): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, homeowner_id, provider_id, service_type, frequency, status, monthly_estimate_cents, next_date, paused_at, resumed_at, cancelled_at, cancellation_reason, created_at, providers(display_name, avatar_url)')
    .eq('homeowner_id', homeownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const provider = (row.providers as { display_name?: string; avatar_url?: string } | null) ?? null;
    return {
      id: row.id as string,
      homeownerId: row.homeowner_id as string,
      providerId: row.provider_id as string,
      providerName: provider?.display_name ?? 'Provider',
      providerAvatarUrl: provider?.avatar_url ?? null,
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
    .select('*, providers(display_name, avatar_url)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const provider = (data.providers as { display_name?: string; avatar_url?: string } | null) ?? null;
  return {
    id: data.id,
    homeownerId: data.homeowner_id,
    providerId: data.provider_id,
    providerName: provider?.display_name ?? 'Provider',
    providerAvatarUrl: provider?.avatar_url ?? null,
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
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'active', resumed_at: new Date().toISOString() })
    .eq('id', id);
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

export async function changeFrequency(id: string, frequency: Frequency): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .update({ frequency })
    .eq('id', id);
  if (error) throw error;
}
