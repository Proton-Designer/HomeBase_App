import type {
  ServiceType,
  Frequency,
  JobStatus,
  ClaimStatus,
  SubscriptionStatus,
  PostingStatus,
  IncidentType,
  ResolutionKind,
} from '../types';

// Single source of truth for the display strings the UI shows for each enum.
// Previously these maps were copy-pasted into ~15 screens — and several
// provider-side copies were incomplete (missing gutter/detailing/tree/solar).

export const SERVICE_LABELS: Record<ServiceType, string> = {
  lawn: 'Lawn Care',
  cleaning: 'Home Cleaning',
  pool: 'Pool Cleaning',
  pest: 'Pest Control',
  pressure: 'Pressure Washing',
  window: 'Window Cleaning',
  gutter: 'Gutter Cleaning',
  detailing: 'Car Detailing',
  tree: 'Tree & Plant Trimming',
  solar: 'Solar Panel Cleaning',
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Every 6 months',
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  en_route: 'En route',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  denied: 'Denied',
  resolved: 'Resolved',
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
};

export const POSTING_STATUS_LABELS: Record<PostingStatus, string> = {
  open: 'Open',
  matched: 'Matched',
  completed: 'Completed',
  expired: 'Expired',
};

export const POSTING_STATUS_TONE: Record<
  PostingStatus,
  'primary' | 'success' | 'neutral' | 'warning'
> = {
  open: 'primary',
  matched: 'success',
  completed: 'neutral',
  expired: 'warning',
};

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  property_damage: 'Property damage',
  theft: 'Theft',
  poor_quality: 'Poor quality',
  no_show: 'No-show',
  injury: 'Injury',
  other: 'Other',
};

export const RESOLUTION_LABELS: Record<ResolutionKind, string> = {
  refund: 'Refund',
  redo: 'Redo the job',
  partial_credit: 'Partial credit',
  none: 'No resolution',
};
