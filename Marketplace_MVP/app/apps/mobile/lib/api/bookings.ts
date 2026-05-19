import { supabase } from '../supabase';
import type { Booking, BookingType, Frequency, ServiceType } from '../types';

export interface RouteMatch {
  providerId: string;
  name: string;
  score: number;
  candidateCount: number;
  reason: string;
}

export async function route(input: {
  serviceType: ServiceType;
  zip?: string;
  scheduledAt?: string;
  bookingType: BookingType;
  frequency?: Frequency | null;
}): Promise<RouteMatch | null> {
  const { data, error } = await supabase.functions.invoke<{
    matched: { providerId: string; name: string; score: number } | null;
    candidateCount: number;
    reason: string;
  }>('route-booking', { body: input });
  if (error) throw error;
  if (!data?.matched) return null;
  return {
    ...data.matched,
    candidateCount: data.candidateCount,
    reason: data.reason,
  };
}

export async function create(input: {
  serviceType: ServiceType;
  bookingType: BookingType;
  frequency: Frequency | null;
  scheduledAt: string;
  addressId: string;
  specialInstructions?: string;
  photoUrl?: string;
  matchedProviderId: string;
  amountCents: number;
}): Promise<Booking> {
  const { data, error } = await supabase.functions.invoke<Booking>('booking-create', {
    body: input,
  });
  if (error) throw error;
  return data!;
}

export async function listForHomeowner(homeownerId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, homeowner_id, provider_id, service_type, booking_type, frequency, ' +
        'scheduled_at, address_id, special_instructions, photo_url, amount_cents, ' +
        'providers(display_name, avatar_url, composite_score_overall, ' +
        'composite_score_reliability, composite_score_quality, ' +
        'composite_score_communication, composite_score_professionalism)'
    )
    .eq('homeowner_id', homeownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as unknown as Record<string, unknown>;
    const provider =
      (r.providers as {
        display_name?: string | null;
        avatar_url?: string | null;
        composite_score_overall?: number | null;
        composite_score_reliability?: number | null;
        composite_score_quality?: number | null;
        composite_score_communication?: number | null;
        composite_score_professionalism?: number | null;
      } | null) ?? null;
    const booking: Booking = {
      id: r.id as string,
      homeownerId: r.homeowner_id as string,
      providerId: r.provider_id as string,
      serviceType: r.service_type as Booking['serviceType'],
      bookingType: r.booking_type as Booking['bookingType'],
      frequency: (r.frequency as Booking['frequency']) ?? null,
      scheduledAt: r.scheduled_at as string,
      addressId: r.address_id as string,
      specialInstructions: (r.special_instructions as string | null) ?? undefined,
      photoUrl: (r.photo_url as string | null) ?? undefined,
      amountCents: r.amount_cents as number,
      providerName: provider?.display_name ?? undefined,
      providerAvatarUrl: provider?.avatar_url ?? null,
    };
    if (provider) {
      booking.compositeScore = {
        overall: provider.composite_score_overall ?? 0,
        reliability: provider.composite_score_reliability ?? 0,
        quality: provider.composite_score_quality ?? 0,
        communication: provider.composite_score_communication ?? 0,
        professionalism: provider.composite_score_professionalism ?? 0,
      };
    }
    return booking;
  });
}

export async function submitHomeownerCheckIn(input: {
  jobId: string;
  reliability: 'on_time' | 'bit_late' | 'very_late';
  quality: number;
  communication: 'great' | 'fine' | 'poor';
  professionalism: 'very' | 'mostly' | 'concerns';
  photoPath?: string | null;
  comment?: string;
}): Promise<void> {
  const { error } = await supabase.functions.invoke('homeowner-checkin', { body: input });
  if (error) throw error;
}
