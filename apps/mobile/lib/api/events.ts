import { supabase } from '../supabase';
import type { ServiceType } from '../types';

export type DemandEventType =
  | 'search'
  | 'view_provider'
  | 'booking_started'
  | 'booking_completed'
  | 'posting_created'
  | 'reminder_handled';

export interface TrackInput {
  event: DemandEventType;
  serviceType?: ServiceType;
  zip?: string;
  metadata?: Record<string, unknown>;
}

export async function track(input: TrackInput): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    await supabase.from('demand_events').insert({
      homeowner_id: data.session?.user.id ?? null,
      service_type: input.serviceType ?? null,
      event_type: input.event,
      zip: input.zip ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Best-effort — never block UX on telemetry.
  }
}
