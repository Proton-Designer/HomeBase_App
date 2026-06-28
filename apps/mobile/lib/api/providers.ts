import { supabase } from '../supabase';
import type { Provider, ServiceType, VerificationTier } from '../types';

type DbProviderRow = {
  id: string;
  business_name: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  verification_tier: number | null;
  composite_score_overall: number | null;
  composite_score_reliability: number | null;
  composite_score_quality: number | null;
  composite_score_communication: number | null;
  composite_score_professionalism: number | null;
  check_in_count: number | null;
  service_types: string[] | null;
  portfolio_photos: string[] | null;
  price_range_min_cents: number | null;
  price_range_max_cents: number | null;
  is_available_today: boolean | null;
  distance_miles?: number | null;
  external_rating?: number | null;
  external_review_count?: number | null;
  external_years?: number | null;
  external_source?: string | null;
};

function mapRow(row: DbProviderRow): Provider {
  return {
    id: row.id,
    name: row.display_name ?? row.business_name ?? 'Provider',
    businessName: row.business_name ?? row.display_name ?? 'Provider',
    avatarUrl: row.avatar_url,
    bio: row.bio ?? undefined,
    verificationTier: (row.verification_tier ?? 0) as VerificationTier,
    compositeScore: {
      overall: row.composite_score_overall ?? 0,
      reliability: row.composite_score_reliability ?? 0,
      quality: row.composite_score_quality ?? 0,
      communication: row.composite_score_communication ?? 0,
      professionalism: row.composite_score_professionalism ?? 0,
    },
    checkInCount: row.check_in_count ?? 0,
    serviceTypes: (row.service_types ?? []) as ServiceType[],
    priceRangeMinCents: row.price_range_min_cents ?? 0,
    priceRangeMaxCents: row.price_range_max_cents ?? 0,
    isAvailableToday: row.is_available_today ?? false,
    distanceMiles: row.distance_miles ?? undefined,
    portfolioPhotos: row.portfolio_photos ?? undefined,
    externalRating: row.external_rating ?? undefined,
    externalReviewCount: row.external_review_count ?? undefined,
    externalYears: row.external_years ?? undefined,
    externalSource: row.external_source ?? undefined,
  };
}

const PROVIDER_COLUMNS =
  'id, business_name, display_name, bio, avatar_url, verification_tier, ' +
  'composite_score_overall, composite_score_reliability, composite_score_quality, ' +
  'composite_score_communication, composite_score_professionalism, ' +
  'check_in_count, service_types, portfolio_photos, price_range_min_cents, price_range_max_cents, ' +
  'is_available_today, external_rating, external_review_count, external_years, external_source';

export async function search(zip: string, service?: ServiceType): Promise<Provider[]> {
  const { data, error } = await supabase.functions.invoke<DbProviderRow[]>('providers-search', {
    body: { zip, service },
  });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function detail(id: string): Promise<Provider | null> {
  const { data, error } = await supabase
    .from('providers')
    .select(PROVIDER_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRow(data as unknown as DbProviderRow);
}

export async function updateProfile(_updates: Partial<Provider>): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('not authenticated');

  const patch: Record<string, unknown> = {};
  if (_updates.businessName !== undefined) patch.business_name = _updates.businessName;
  if (_updates.name !== undefined) patch.display_name = _updates.name;
  if (_updates.bio !== undefined) patch.bio = _updates.bio;
  if (_updates.avatarUrl !== undefined) patch.avatar_url = _updates.avatarUrl;
  if (_updates.serviceTypes !== undefined) patch.service_types = _updates.serviceTypes;
  if (_updates.portfolioPhotos !== undefined) patch.portfolio_photos = _updates.portfolioPhotos;
  if (_updates.priceRangeMinCents !== undefined) patch.price_range_min_cents = _updates.priceRangeMinCents;
  if (_updates.priceRangeMaxCents !== undefined) patch.price_range_max_cents = _updates.priceRangeMaxCents;
  if (_updates.isAvailableToday !== undefined) patch.is_available_today = _updates.isAvailableToday;

  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase
    .from('providers')
    .update(patch)
    .eq('owner_user_id', session.user.id);
  if (error) throw error;
}

export async function onboard(payload: {
  businessDetails: object;
  serviceArea: object;
  availability: object;
}): Promise<{ providerId: string }> {
  // Use a direct fetch (not `supabase.functions.invoke`) with an abort timeout. The
  // invoke helper can leave its promise unsettled in React Native for an authenticated
  // function — the request reaches the server (it writes the provider row) but the client
  // never resolves, hanging the onboarding "Continue" button forever. `fetch().json()`
  // resolves reliably, and the timeout converts any stall into a surfaced error.
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/provider-onboard`;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${session?.access_token ?? anonKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => null)) as {
      providerId?: string;
      error?: string;
    } | null;
    if (!res.ok) throw new Error(json?.error ?? `Onboarding failed (${res.status})`);
    if (!json?.providerId) throw new Error('provider-onboard returned no providerId');
    return { providerId: json.providerId };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Setup timed out — check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Replace the provider's service area (single home zip + radius). */
export async function saveServiceArea(
  providerId: string,
  zip: string,
  radiusMiles: number,
): Promise<void> {
  await supabase.from('provider_service_areas').delete().eq('provider_id', providerId);
  const { error } = await supabase
    .from('provider_service_areas')
    .insert({ provider_id: providerId, zip, radius_miles: radiusMiles });
  if (error) throw error;
}

/** Replace the provider's weekly availability with one row per active day. */
export async function saveAvailability(
  providerId: string,
  activeDays: number[],
  start: string,
  end: string,
): Promise<void> {
  await supabase.from('provider_availability').delete().eq('provider_id', providerId);
  if (activeDays.length === 0) return;
  const rows = activeDays.map((day) => ({
    provider_id: providerId,
    day_of_week: day,
    start_time: start,
    end_time: end,
  }));
  const { error } = await supabase.from('provider_availability').insert(rows);
  if (error) throw error;
}

export type BlockedTime = {
  id: string;
  provider_id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
  created_at: string;
};

export async function listBlockedTimes(
  providerId: string,
  fromDate: string,
  toDate: string,
): Promise<BlockedTime[]> {
  const { data, error } = await supabase
    .from('provider_blocked_times')
    .select('*')
    .eq('provider_id', providerId)
    .gte('start_at', fromDate)
    .lte('end_at', toDate)
    .order('start_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BlockedTime[];
}

export async function createBlockedTime(input: {
  providerId: string;
  startAt: string;
  endAt: string;
  reason?: string;
}): Promise<BlockedTime> {
  const { data, error } = await supabase
    .from('provider_blocked_times')
    .insert({
      provider_id: input.providerId,
      start_at: input.startAt,
      end_at: input.endAt,
      reason: input.reason ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as BlockedTime;
}

export async function deleteBlockedTime(id: string): Promise<void> {
  const { error } = await supabase
    .from('provider_blocked_times')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── provider_availability ────────────────────────────────────────────────────

export type AvailabilityRow = {
  id: string;
  provider_id: string;
  day_of_week: number; // 0 = Sunday … 6 = Saturday
  start_time: string;  // "HH:MM:SS"
  end_time: string;    // "HH:MM:SS"
};

export async function listAvailability(providerId: string): Promise<AvailabilityRow[]> {
  const { data, error } = await supabase
    .from('provider_availability')
    .select('*')
    .eq('provider_id', providerId)
    .order('day_of_week', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AvailabilityRow[];
}

/**
 * Returns the floor price (lowest price_range_min_cents) for each service type
 * among active providers. Used to surface real price ranges on the Book catalog.
 * Falls back gracefully — returns an empty Record if no providers are seeded.
 */
export async function getPriceFloors(): Promise<Partial<Record<ServiceType, number>>> {
  const { data, error } = await supabase
    .from('providers')
    .select('service_types, price_range_min_cents')
    .is('valid_to', null)
    .not('price_range_min_cents', 'is', null);

  if (error) {
    console.error('getPriceFloors:', error);
    return {};
  }
  if (!data) return {};

  const floors: Partial<Record<ServiceType, number>> = {};
  for (const row of data as { service_types: string[]; price_range_min_cents: number }[]) {
    for (const svcType of row.service_types ?? []) {
      const existing = floors[svcType as ServiceType];
      if (existing === undefined || row.price_range_min_cents < existing) {
        floors[svcType as ServiceType] = row.price_range_min_cents;
      }
    }
  }
  return floors;
}
