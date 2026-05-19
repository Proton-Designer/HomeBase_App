// Shared admin row/status types for the dashboard tables.

export type ProviderQueueStatus = 'pending' | 'verified' | 'suspended';

export interface ProviderQueueRow {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  tier: 0 | 1 | 2;
  status: ProviderQueueStatus;
  submittedAt: string;
  serviceTypes: ('lawn' | 'cleaning')[];
}

export type AdminJobStatus =
  | 'booked'
  | 'confirmed'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface AdminJob {
  id: string;
  homeowner: string;
  homeownerEmail: string;
  providerName: string;
  service: 'lawn' | 'cleaning';
  scheduledAt: string;
  status: AdminJobStatus;
  amountCents: number;
  createdAt: string;
  checkInSubmitted: boolean;
}

export type ClaimStatus = 'submitted' | 'under_review' | 'approved' | 'denied' | 'resolved';

export type ClaimIncidentType =
  | 'property_damage'
  | 'theft'
  | 'poor_quality'
  | 'no_show'
  | 'injury'
  | 'other';

export interface AdminClaim {
  id: string;
  jobId: string;
  homeowner: string;
  provider: string;
  filedAt: string;
  description: string;
  incidentType: ClaimIncidentType;
  status: ClaimStatus;
  amountRequestedCents: number;
  photos: string[];
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
}

export interface TrustScoreRow {
  providerId: string;
  providerName: string;
  overall: number;
  reliability: number;
  quality: number;
  communication: number;
  professionalism: number;
  checkInCount: number;
  lastUpdated: string;
}

export type AdminUserRole = 'homeowner' | 'provider_owner' | 'provider_tech';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  joinedAt: string;
  lastActive: string;
}
