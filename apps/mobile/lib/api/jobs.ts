import { supabase } from '../supabase';
import { invokeFn } from './functions';
import type { Job, JobStatus, ServiceType } from '../types';

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

const JOB_LIST_SELECT =
  'id, booking_id, provider_id, homeowner_id, status, service_type, ' +
  'scheduled_at, amount_cents, timestamps, assigned_tech_id, ' +
  'profiles!jobs_homeowner_id_fkey(first_name, last_name), ' +
  'bookings(addresses(street, city, state, zip, neighborhood)), ' +
  'providers(display_name, avatar_url, composite_score_overall)';

function mapJobListRow(row: unknown): Job {
  const r = row as Record<string, unknown>;
  const homeownerProfile =
    (r.profiles as { first_name?: string | null; last_name?: string | null } | null) ?? null;
  const firstName = homeownerProfile?.first_name?.trim() ?? '';
  const lastName = homeownerProfile?.last_name?.trim() ?? '';
  const homeownerFullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const booking = (r.bookings as { addresses?: RawAddress | null } | null) ?? null;
  const addr = booking?.addresses ?? null;
  const neighborhood = addr?.neighborhood ?? addr?.city ?? null;
  const prov =
    (r.providers as {
      display_name?: string | null;
      avatar_url?: string | null;
      composite_score_overall?: number | null;
    } | null) ?? null;
  return {
    id: r.id as string,
    bookingId: r.booking_id as string,
    providerId: r.provider_id as string,
    providerName: (prov?.display_name ?? homeownerFullName) || 'Homeowner',
    providerAvatarUrl: prov?.avatar_url ?? null,
    providerScore: prov?.composite_score_overall ?? null,
    homeownerId: r.homeowner_id as string,
    // First name + separate last initial so cards can show the privacy-masked "John D."
    homeownerName: firstName || homeownerFullName || undefined,
    homeownerLastInitial: lastName ? lastName[0].toUpperCase() : undefined,
    homeownerNeighborhood: neighborhood,
    addressFormatted: buildAddressFormatted(addr),
    addressZip: addr?.zip ?? null,
    status: r.status as JobStatus,
    serviceType: r.service_type as ServiceType,
    scheduledAt: r.scheduled_at as string,
    amountCents: r.amount_cents as number,
    timestamps: (r.timestamps as Job['timestamps']) ?? {},
    assignedTechId: (r.assigned_tech_id as string | null) ?? null,
  };
}

export async function listForHomeowner(homeownerId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_LIST_SELECT)
    .eq('homeowner_id', homeownerId)
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapJobListRow);
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

export async function accept(jobId: string, scheduledAt?: string): Promise<void> {
  await invokeFn('job-accept', { jobId, scheduledAt });
}

export async function decline(jobId: string, reason?: string): Promise<void> {
  await invokeFn('job-decline', { jobId, reason });
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
  await invokeFn('provider-checkin', input);
}

export async function detail(id: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_LIST_SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return mapJobListRow(data);
}

/** Jobs for a provider within a date range (excludes completed/cancelled). */
export async function listForProviderInRange(
  providerId: string,
  from: string,
  to: string,
): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_LIST_SELECT)
    .eq('provider_id', providerId)
    .gte('scheduled_at', from)
    .lte('scheduled_at', to)
    .in('status', ['booked', 'confirmed', 'en_route', 'in_progress'])
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapJobListRow);
}
