import { supabase } from '../supabase';
import type { Job, JobStatus, ServiceType } from '../types';

interface RawAddress {
  street?: string | null;
  unit?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  neighborhood?: string | null;
}

function buildAddressFormatted(addr: RawAddress | null | undefined): string | null {
  if (!addr?.street) return null;
  const unit = addr.unit ? ` Unit ${addr.unit}` : '';
  return `${addr.street}${unit}, ${addr.city ?? ''}, ${addr.state ?? ''} ${addr.zip ?? ''}`.trim();
}

const JOB_LIST_SELECT =
  'id, booking_id, provider_id, homeowner_id, status, service_type, ' +
  'scheduled_at, amount_cents, timestamps, ' +
  'profiles!jobs_homeowner_id_fkey(first_name, last_name), ' +
  'bookings(addresses(street, unit, city, state, zip, neighborhood)), ' +
  'providers(display_name, avatar_url)';

function mapJobListRow(row: unknown): Job {
  const r = row as Record<string, unknown>;
  const homeownerProfile =
    (r.profiles as { first_name?: string | null; last_name?: string | null } | null) ?? null;
  const homeownerName = [homeownerProfile?.first_name, homeownerProfile?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const booking = (r.bookings as { addresses?: RawAddress | null } | null) ?? null;
  const addr = booking?.addresses ?? null;
  const neighborhood = addr?.neighborhood ?? addr?.city ?? null;
  const prov = (r.providers as { display_name?: string | null; avatar_url?: string | null } | null) ?? null;
  return {
    id: r.id as string,
    bookingId: r.booking_id as string,
    providerId: r.provider_id as string,
    providerName: (prov?.display_name ?? homeownerName) || 'Homeowner',
    providerAvatarUrl: prov?.avatar_url ?? null,
    homeownerId: r.homeowner_id as string,
    homeownerName: homeownerName || undefined,
    homeownerNeighborhood: neighborhood,
    addressFormatted: buildAddressFormatted(addr),
    addressZip: addr?.zip ?? null,
    status: r.status as JobStatus,
    serviceType: r.service_type as ServiceType,
    scheduledAt: r.scheduled_at as string,
    amountCents: r.amount_cents as number,
    timestamps: (r.timestamps as Job['timestamps']) ?? {},
  };
}

export async function listForProvider(providerId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_LIST_SELECT)
    .eq('provider_id', providerId)
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapJobListRow);
}

/** Jobs assigned to a specific crew member (tech). */
export async function listForTech(techUserId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_LIST_SELECT)
    .eq('assigned_tech_id', techUserId)
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapJobListRow);
}

export async function accept(jobId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('job-accept', { body: { jobId } });
  if (error) throw error;
}

export async function decline(jobId: string, reason?: string): Promise<void> {
  const { error } = await supabase.functions.invoke('job-decline', {
    body: { jobId, reason },
  });
  if (error) throw error;
}

export async function setStatus(jobId: string, status: 'en_route' | 'in_progress'): Promise<void> {
  const { error } = await supabase.from('jobs').update({ status }).eq('id', jobId);
  if (error) throw error;
}

export async function submitProviderCheckIn(input: {
  jobId: string;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
  notes: string;
  tags: string[];
}): Promise<void> {
  const { error } = await supabase.functions.invoke('provider-checkin', { body: input });
  if (error) throw error;
}

export async function detail(id: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      bookings (
        addresses ( street, unit, city, state, zip, neighborhood )
      ),
      providers ( display_name, avatar_url )
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  const r = data as unknown as Record<string, unknown>;
  const booking = (r.bookings as { addresses?: RawAddress | null } | null) ?? null;
  const addr = booking?.addresses ?? null;
  const prov = (r.providers as { display_name?: string | null; avatar_url?: string | null } | null) ?? null;
  return {
    id: r.id as string,
    bookingId: r.booking_id as string,
    providerId: r.provider_id as string,
    providerName: prov?.display_name ?? 'Provider',
    providerAvatarUrl: prov?.avatar_url ?? null,
    homeownerId: r.homeowner_id as string,
    addressFormatted: buildAddressFormatted(addr),
    addressZip: addr?.zip ?? null,
    status: r.status as JobStatus,
    serviceType: r.service_type as ServiceType,
    scheduledAt: r.scheduled_at as string,
    amountCents: r.amount_cents as number,
    timestamps: (r.timestamps as Job['timestamps']) ?? {},
  };
}
