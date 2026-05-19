// Raw row shapes returned by Supabase queries.
// Column names match the actual deployed DB schema.

export interface DbProvider {
  id: string;
  business_name: string | null;
  display_name: string | null;
  verification_tier: number | null;
  composite_score_overall: number | null;
  composite_score_reliability?: number | null;
  composite_score_quality?: number | null;
  composite_score_communication?: number | null;
  composite_score_professionalism?: number | null;
  check_in_count: number | null;
  valid_to: string | null;
  service_types?: string[] | null;
  created_at?: string | null;
  owner_user_id?: string | null;
  updated_at?: string | null;
}

export interface DbJob {
  id: string;
  status: string | null;
  service_type: string | null;
  scheduled_at: string | null;
  amount_cents: number | null;
  created_at: string | null;
  timestamps?: Record<string, unknown> | null;
  providers?: { business_name: string | null; display_name: string | null } | null;
  profiles?: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

export interface DbClaim {
  id: string;
  job_id: string | null;
  status: string | null;
  description: string | null;
  incident_type: string | null;
  requested_amount_cents: number | null;
  requested_resolution?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string | null;
  homeowner_id?: string | null;
  photo_urls: string[] | null;
  providers?: { display_name: string | null; business_name: string | null } | null;
  jobs?: { service_type: string | null } | null;
  profiles?: { first_name: string | null; last_name: string | null } | null;
}

export interface DbProfile {
  id: string;
  role: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string | null;
}
