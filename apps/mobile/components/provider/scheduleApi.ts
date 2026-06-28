/**
 * Schedule-specific data helpers.
 * These live in component scope because jobs.ts is outside our edit scope —
 * we duplicate the minimal Supabase query rather than modify a shared file.
 */
import { supabase } from '../../lib/supabase';
import type { Job, JobStatus, ServiceType } from '../../lib/types';

interface RawAddress {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  neighborhood?: string | null;
}

function buildAddressFormatted(addr: RawAddress | null | undefined): string | null {
  if (!addr?.street) return null;
  return `${addr.street}, ${addr.city ?? ''}, ${addr.state ?? ''} ${addr.zip ?? ''}`.trim();
}

const JOB_RANGE_SELECT =
  'id, booking_id, provider_id, homeowner_id, status, service_type, ' +
  'scheduled_at, amount_cents, timestamps, ' +
  'profiles!jobs_homeowner_id_fkey(first_name, last_name), ' +
  'bookings(addresses(street, city, state, zip, neighborhood)), ' +
  'providers(display_name, avatar_url, composite_score_overall)';

function mapRow(row: unknown): Job {
  const r = row as Record<string, unknown>;
  const profile = (r.profiles as { first_name?: string | null; last_name?: string | null } | null) ?? null;
  const homeownerName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  const booking = (r.bookings as { addresses?: RawAddress | null } | null) ?? null;
  const addr = booking?.addresses ?? null;
  const prov = (r.providers as {
    display_name?: string | null;
    avatar_url?: string | null;
    composite_score_overall?: number | null;
  } | null) ?? null;
  return {
    id: r.id as string,
    bookingId: r.booking_id as string,
    providerId: r.provider_id as string,
    providerName: prov?.display_name ?? homeownerName ?? 'Provider',
    providerAvatarUrl: prov?.avatar_url ?? null,
    providerScore: prov?.composite_score_overall ?? null,
    homeownerId: r.homeowner_id as string,
    homeownerName: homeownerName || undefined,
    homeownerNeighborhood: addr?.neighborhood ?? addr?.city ?? null,
    addressFormatted: buildAddressFormatted(addr),
    addressZip: addr?.zip ?? null,
    status: r.status as JobStatus,
    serviceType: r.service_type as ServiceType,
    scheduledAt: r.scheduled_at as string,
    amountCents: r.amount_cents as number,
    timestamps: (r.timestamps as Job['timestamps']) ?? {},
  };
}

/** Fetch jobs for a provider within a date range. Excludes completed/cancelled. */
export async function listForProviderInRange(
  providerId: string,
  from: string,
  to: string,
): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_RANGE_SELECT)
    .eq('provider_id', providerId)
    .gte('scheduled_at', from)
    .lte('scheduled_at', to)
    .in('status', ['booked', 'confirmed', 'en_route', 'in_progress'])
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}
