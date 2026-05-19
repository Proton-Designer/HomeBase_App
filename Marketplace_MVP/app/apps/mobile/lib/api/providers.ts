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
  };
}

const PROVIDER_COLUMNS =
  'id, business_name, display_name, bio, avatar_url, verification_tier, ' +
  'composite_score_overall, composite_score_reliability, composite_score_quality, ' +
  'composite_score_communication, composite_score_professionalism, ' +
  'check_in_count, service_types, portfolio_photos, price_range_min_cents, price_range_max_cents, ' +
  'is_available_today';

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
}): Promise<void> {
  const { error } = await supabase.functions.invoke('provider-onboard', { body: payload });
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
