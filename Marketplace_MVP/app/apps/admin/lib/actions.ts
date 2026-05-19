'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from './supabase-server';
import type {
  ProviderQueueRow,
  AdminJob,
  AdminClaim,
  TrustScoreRow,
  AdminUser,
} from './admin-types';
import type { DbProvider, DbJob, DbClaim, DbProfile } from './db-types';

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

export async function fetchProviders(): Promise<ProviderQueueRow[]> {
  const { data, error } = await supabaseAdmin
    .from('providers')
    .select(
      'id, business_name, display_name, verification_tier, composite_score_overall, ' +
        'check_in_count, valid_to, service_types, created_at, owner_user_id'
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchProviders]', error.message);
    throw error;
  }

  // Pull owning profiles in a single round-trip so we can show owner name + email.
  const providers = (data ?? []) as unknown as DbProvider[];
  const ownerIds = Array.from(
    new Set(providers.map((r) => r.owner_user_id ?? null).filter(Boolean) as string[])
  );
  const profilesById: Record<string, { first_name: string | null; last_name: string | null; email: string | null }> = {};
  if (ownerIds.length) {
    const { data: profilesData } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', ownerIds);
    const profiles = (profilesData ?? []) as unknown as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    }>;
    for (const p of profiles) {
      profilesById[p.id] = {
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
      };
    }
  }

  return providers.map((r) => mapProvider(r, profilesById[r.owner_user_id ?? ''] ?? null));
}

function mapProvider(
  r: DbProvider,
  owner: { first_name: string | null; last_name: string | null; email: string | null } | null
): ProviderQueueRow {
  const tier = (r.verification_tier ?? 0) as 0 | 1 | 2;
  // verification_tier is the source of truth: 0 = pending, 1+ = verified;
  // valid_to in the past = suspended.
  const status: ProviderQueueRow['status'] =
    r.valid_to && new Date(r.valid_to) < new Date()
      ? 'suspended'
      : tier === 0
        ? 'pending'
        : 'verified';

  const ownerName =
    [owner?.first_name, owner?.last_name].filter(Boolean).join(' ').trim() || '—';

  return {
    id: r.id,
    businessName: r.business_name ?? '—',
    ownerName,
    email: owner?.email ?? '',
    tier,
    status,
    submittedAt: r.created_at ?? new Date().toISOString(),
    serviceTypes: normaliseServiceTypes(r.service_types),
  };
}

function normaliseServiceTypes(raw: string[] | null | undefined): ('lawn' | 'cleaning')[] {
  if (!raw) return [];
  return raw.filter((s): s is 'lawn' | 'cleaning' => s === 'lawn' || s === 'cleaning');
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export async function fetchJobs(): Promise<AdminJob[]> {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select(
      'id, status, service_type, scheduled_at, amount_cents, created_at, timestamps, ' +
        'providers(business_name, display_name), ' +
        'profiles!jobs_homeowner_id_fkey(first_name, last_name, email)'
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchJobs]', error.message);
    throw error;
  }

  return (data as unknown as DbJob[]).map(mapJob);
}

function mapJob(r: DbJob): AdminJob {
  const homeownerFirst = r.profiles?.first_name ?? '';
  const homeownerLast = r.profiles?.last_name ?? '';
  const homeownerName = [homeownerFirst, homeownerLast].filter(Boolean).join(' ') || '—';

  const checkInSubmitted = !!(r.timestamps && typeof r.timestamps === 'object' && 'completed' in (r.timestamps as object));

  return {
    id: r.id,
    homeowner: homeownerName,
    homeownerEmail: r.profiles?.email ?? '',
    providerName: r.providers?.business_name ?? r.providers?.display_name ?? '—',
    service: normaliseService(r.service_type),
    scheduledAt: r.scheduled_at ?? new Date().toISOString(),
    status: normaliseJobStatus(r.status),
    amountCents: r.amount_cents ?? 0,
    createdAt: r.created_at ?? new Date().toISOString(),
    checkInSubmitted,
  };
}

function normaliseService(raw: string | null): 'lawn' | 'cleaning' {
  if (raw === 'lawn' || raw === 'cleaning') return raw;
  return 'lawn';
}

function normaliseJobStatus(raw: string | null): AdminJob['status'] {
  const valid: AdminJob['status'][] = [
    'booked', 'confirmed', 'en_route', 'in_progress', 'completed', 'cancelled',
  ];
  return valid.includes(raw as AdminJob['status']) ? (raw as AdminJob['status']) : 'booked';
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export async function fetchClaims(): Promise<AdminClaim[]> {
  const { data, error } = await supabaseAdmin
    .from('claims')
    .select(
      'id, job_id, status, incident_type, description, photo_urls, ' +
        'requested_amount_cents, requested_resolution, resolution_notes, resolved_at, ' +
        'created_at, homeowner_id, ' +
        'providers(display_name, business_name), jobs(service_type), ' +
        'profiles!claims_homeowner_id_fkey(first_name, last_name)'
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchClaims]', error.message);
    throw error;
  }

  return (data as unknown as DbClaim[]).map(mapClaim);
}

function mapClaim(r: DbClaim): AdminClaim {
  const homeownerName =
    [r.profiles?.first_name, r.profiles?.last_name].filter(Boolean).join(' ').trim() || '—';

  return {
    id: r.id,
    jobId: r.job_id ?? '—',
    homeowner: homeownerName,
    provider: r.providers?.display_name ?? r.providers?.business_name ?? '—',
    filedAt: r.created_at ?? new Date().toISOString(),
    description: r.description ?? '',
    incidentType: normaliseIncidentType(r.incident_type),
    status: normaliseClaimStatus(r.status),
    amountRequestedCents: r.requested_amount_cents ?? 0,
    photos: r.photo_urls ?? [],
    resolutionNotes: r.resolution_notes ?? null,
    resolvedAt: r.resolved_at ?? null,
  };
}

function normaliseIncidentType(raw: string | null): AdminClaim['incidentType'] {
  const valid: AdminClaim['incidentType'][] = [
    'property_damage', 'theft', 'poor_quality', 'no_show', 'injury', 'other',
  ];
  return valid.includes(raw as AdminClaim['incidentType'])
    ? (raw as AdminClaim['incidentType'])
    : 'other';
}

function normaliseClaimStatus(raw: string | null): AdminClaim['status'] {
  const valid: AdminClaim['status'][] = ['submitted', 'under_review', 'approved', 'denied', 'resolved'];
  return valid.includes(raw as AdminClaim['status']) ? (raw as AdminClaim['status']) : 'submitted';
}

// ---------------------------------------------------------------------------
// Trust scores — rolled-up from providers.composite_score_*
// ---------------------------------------------------------------------------

export async function fetchTrustScores(): Promise<TrustScoreRow[]> {
  const { data, error } = await supabaseAdmin
    .from('providers')
    .select(
      'id, display_name, business_name, composite_score_overall, composite_score_reliability, ' +
        'composite_score_quality, composite_score_communication, composite_score_professionalism, ' +
        'check_in_count, updated_at'
    )
    .order('composite_score_overall', { ascending: false });

  if (error) {
    console.error('[fetchTrustScores]', error.message);
    throw error;
  }

  const rows = (data ?? []) as unknown as DbProvider[];
  return rows.map((p) => ({
    providerId: p.id,
    providerName: p.display_name ?? p.business_name ?? '—',
    overall: p.composite_score_overall ?? 0,
    reliability: p.composite_score_reliability ?? 0,
    quality: p.composite_score_quality ?? 0,
    communication: p.composite_score_communication ?? 0,
    professionalism: p.composite_score_professionalism ?? 0,
    checkInCount: p.check_in_count ?? 0,
    lastUpdated: p.updated_at ?? new Date().toISOString(),
  } satisfies TrustScoreRow));
}

// ---------------------------------------------------------------------------
// Users — pull last_sign_in_at from auth.users
// ---------------------------------------------------------------------------

export async function fetchUsers(): Promise<AdminUser[]> {
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role, first_name, last_name, email, phone, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchUsers]', error.message);
    throw error;
  }

  // Fetch auth users in one pass (service role) for last_sign_in_at.
  const lastSignInByUserId: Record<string, string | null> = {};
  try {
    const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of authList?.users ?? []) {
      lastSignInByUserId[u.id] = u.last_sign_in_at ?? null;
    }
  } catch (e) {
    console.error('[fetchUsers] auth.admin.listUsers', (e as Error).message);
  }

  return (profiles as DbProfile[]).map((r) => mapUser(r, lastSignInByUserId[r.id] ?? null));
}

function mapUser(r: DbProfile, lastSignInAt: string | null): AdminUser {
  const joined = [r.first_name, r.last_name].filter(Boolean).join(' ');
  const name = joined || (r.email ?? '—');
  return {
    id: r.id,
    name,
    email: r.email ?? '',
    role: normaliseRole(r.role),
    joinedAt: r.created_at ?? new Date().toISOString(),
    lastActive: lastSignInAt ?? r.created_at ?? new Date().toISOString(),
  };
}

function normaliseRole(raw: string | null): AdminUser['role'] {
  if (raw === 'homeowner' || raw === 'provider_owner' || raw === 'provider_tech') return raw;
  return 'homeowner';
}

// ---------------------------------------------------------------------------
// Verification tier override — §7.5
// ---------------------------------------------------------------------------

export async function overrideVerificationTier(
  providerId: string,
  newTier: 0 | 1 | 2
): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin
    .from('providers')
    .update({ verification_tier: newTier, updated_at: new Date().toISOString() })
    .eq('id', providerId);

  if (error) {
    console.error('[overrideVerificationTier]', error.message);
    return { error: error.message };
  }

  revalidatePath('/admin/trust-scores');
  revalidatePath('/admin/providers');

  return { error: null };
}
