export type UserRole = 'homeowner' | 'provider_owner' | 'provider_tech';

export type PreferredWindow = 'this_week' | 'next_1_2_weeks' | 'this_month' | 'flexible';

export type ServiceType =
  | 'lawn'
  | 'cleaning'
  | 'pool'
  | 'pest'
  | 'pressure'
  | 'window'
  | 'gutter'
  | 'detailing'
  | 'tree'
  | 'solar';

export type BookingType = 'subscription' | 'one_off';
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semi_annual';
export type VerificationTier = 0 | 1 | 2;
export type JobStatus =
  | 'booked'
  | 'confirmed'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface CompositeScore {
  overall: number;
  reliability: number;
  quality: number;
  communication: number;
  professionalism: number;
}

export interface Provider {
  id: string;
  name: string;
  businessName: string;
  avatarUrl: string | null;
  bio?: string;
  verificationTier: VerificationTier;
  compositeScore: CompositeScore;
  checkInCount: number;
  serviceTypes: ServiceType[];
  priceRangeMinCents: number;
  priceRangeMaxCents: number;
  isAvailableToday: boolean;
  distanceMiles?: number;
  portfolioPhotos?: string[];
  /** External reputation badge (legitimacy credential, NOT the native trust score). */
  externalRating?: number;
  externalReviewCount?: number;
  externalYears?: number;
  externalSource?: string;
}

export interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  neighborhood?: string;
}

export interface Job {
  id: string;
  bookingId: string;
  providerId: string;
  providerName: string;
  providerAvatarUrl?: string | null;
  providerScore?: number | null;
  homeownerId: string;
  homeownerName?: string;
  homeownerLastInitial?: string;
  homeownerNeighborhood?: string | null;
  addressFormatted?: string | null;
  addressZip?: string | null;
  status: JobStatus;
  serviceType: ServiceType;
  scheduledAt: string;
  amountCents: number;
  timestamps: Partial<Record<JobStatus, string>>;
  assignedTechId?: string | null;
}

export interface Booking {
  id: string;
  homeownerId: string;
  providerId: string;
  serviceType: ServiceType;
  bookingType: BookingType;
  frequency: Frequency | null;
  scheduledAt: string;
  addressId: string;
  specialInstructions?: string;
  photoUrl?: string;
  amountCents: number;
  providerName?: string;
  providerAvatarUrl?: string | null;
  compositeScore?: CompositeScore;
}

// ─── Subscriptions ────────────────────────────────────────────────────────
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export interface Subscription {
  id: string;
  homeownerId: string;
  providerId: string;
  providerName: string;
  providerAvatarUrl: string | null;
  providerTrustScore?: number | null;
  providerVerificationTier?: VerificationTier;
  serviceType: ServiceType;
  frequency: Frequency;
  status: SubscriptionStatus;
  monthlyEstimateCents: number;
  nextDate: string | null;
  pausedAt?: string | null;
  resumedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
}

// ─── Damage claims ────────────────────────────────────────────────────────
export type IncidentType =
  | 'property_damage'
  | 'theft'
  | 'poor_quality'
  | 'no_show'
  | 'injury'
  | 'other';

export type ClaimStatus =
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'denied'
  | 'resolved';

export type ResolutionKind = 'refund' | 'redo' | 'partial_credit' | 'none';

export interface Claim {
  id: string;
  jobId: string;
  homeownerId: string;
  providerId: string;
  providerName: string;
  serviceType: ServiceType;
  incidentType: IncidentType;
  description: string;
  photoUrls: string[];
  requestedResolution: ResolutionKind;
  requestedAmountCents: number | null;
  status: ClaimStatus;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

// ─── Job postings ─────────────────────────────────────────────────────────
export type PostingStatus = 'open' | 'matched' | 'completed' | 'expired';

export interface Posting {
  id: string;
  serviceType: ServiceType;
  headline: string;
  description: string;
  photos: string[];
  status: PostingStatus;
  postedAt: string;
  matchCount: number;
  matchedProviderId?: string;
  matchedProviderName?: string;
}

// ─── Provider crew ────────────────────────────────────────────────────────
export type TeamRole = 'owner' | 'tech';
export type TeamStatus = 'invited' | 'active' | 'removed';

export interface CrewMember {
  id: string;
  providerId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: TeamRole;
  status: TeamStatus;
  invitedAt: string;
  joinedAt?: string | null;
  removedAt?: string | null;
  todayJobCount?: number;
}

// ─── Provider job queue ───────────────────────────────────────────────────
export interface ProviderJobRequest {
  id: string;
  serviceType: string;
  scheduledAt: string;
  neighborhood: string;
  payoutCents: number;
}
