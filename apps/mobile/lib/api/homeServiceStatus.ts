import { supabase } from '../supabase';
import type { ServiceType } from '../types';

export type HomeServiceState = 'active' | 'self_managed' | 'not_applicable';
export type ServiceSource = 'platform' | 'self' | 'external';

export interface HomeServiceStatus {
  serviceType: ServiceType;
  lastServicedAt: string | null;
  lastSource: ServiceSource | null;
  cadenceDaysOverride: number | null;
  state: HomeServiceState;
  snoozedUntil: string | null;
  dismissCount: number;
}

type DbRow = {
  service_type: ServiceType;
  last_serviced_at: string | null;
  last_source: ServiceSource | null;
  cadence_days_override: number | null;
  state: HomeServiceState;
  snoozed_until: string | null;
  dismiss_count: number;
};

const COLS =
  'service_type, last_serviced_at, last_source, cadence_days_override, state, snoozed_until, dismiss_count';

function map(r: DbRow): HomeServiceStatus {
  return {
    serviceType: r.service_type,
    lastServicedAt: r.last_serviced_at,
    lastSource: r.last_source,
    cadenceDaysOverride: r.cadence_days_override,
    state: r.state,
    snoozedUntil: r.snoozed_until,
    dismissCount: r.dismiss_count,
  };
}

export async function fetchStatuses(homeownerId: string): Promise<HomeServiceStatus[]> {
  const { data, error } = await supabase
    .from('home_service_status')
    .select(COLS)
    .eq('homeowner_id', homeownerId);
  if (error) throw error;
  return ((data ?? []) as unknown as DbRow[]).map(map);
}

async function upsert(patch: Record<string, unknown> & { service_type: ServiceType }): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('not authenticated');
  const { error } = await supabase
    .from('home_service_status')
    .upsert(
      { homeowner_id: session.user.id, updated_at: new Date().toISOString(), ...patch },
      { onConflict: 'homeowner_id,service_type' },
    );
  if (error) throw error;
}

/** "Already handled" — records a service was done (here or elsewhere), resetting the cadence. */
export async function markHandled(serviceType: ServiceType, source: ServiceSource = 'self'): Promise<void> {
  await upsert({
    service_type: serviceType,
    last_serviced_at: new Date().toISOString(),
    last_source: source,
    state: 'active',
    snoozed_until: null,
  });
}

/** "Remind me later" — snoozes for N days and counts the dismissal. */
export async function snooze(serviceType: ServiceType, days = 14, dismissCount = 0): Promise<void> {
  await upsert({
    service_type: serviceType,
    snoozed_until: new Date(Date.now() + days * 86_400_000).toISOString(),
    dismiss_count: dismissCount + 1,
  });
}

/** "I handle this myself" / "Not applicable" — mutes the service entirely. */
export async function mute(serviceType: ServiceType, state: Exclude<HomeServiceState, 'active'>): Promise<void> {
  await upsert({ service_type: serviceType, state });
}
