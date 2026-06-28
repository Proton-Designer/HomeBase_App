import type { Booking, ServiceType } from '../types';

/** A provider the homeowner has hired before — the raw material for one-tap rehire. */
export interface ProviderSummary {
  providerId: string;
  name: string;
  avatarUrl: string | null;
  scoreOverall: number | null;
  lastServiceType: ServiceType;
  bookingCount: number;
}

/**
 * Derives the "Your Pros" list from the homeowner's bookings (already ordered
 * newest-first by the API). Deduplicates by provider, keeping the most recent
 * booking's details and counting total bookings per provider. No extra network.
 */
export function deriveYourPros(bookings: Booking[]): ProviderSummary[] {
  const byProvider = new Map<string, ProviderSummary>();
  for (const b of bookings) {
    if (!b.providerId) continue;
    const existing = byProvider.get(b.providerId);
    if (existing) {
      existing.bookingCount += 1;
      continue;
    }
    byProvider.set(b.providerId, {
      providerId: b.providerId,
      name: b.providerName ?? 'Your pro',
      avatarUrl: b.providerAvatarUrl ?? null,
      scoreOverall: b.compositeScore?.overall ?? null,
      lastServiceType: b.serviceType,
      bookingCount: 1,
    });
  }
  return Array.from(byProvider.values());
}
