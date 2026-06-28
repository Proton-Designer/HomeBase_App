import { supabase } from '../supabase';
import { invokeFn } from './functions';
import type {
  Claim,
  ClaimStatus,
  IncidentType,
  ResolutionKind,
  ServiceType,
} from '../types';

export async function create(input: {
  jobId: string;
  providerId: string;
  incidentType: IncidentType;
  description: string;
  photoUrls: string[];
  requestedResolution: ResolutionKind;
  requestedAmountCents?: number | null;
}): Promise<{ id: string }> {
  return invokeFn<{ id: string }>('claim-create', input);
}

export async function listForHomeowner(homeownerId: string): Promise<Claim[]> {
  const { data, error } = await supabase
    .from('claims')
    .select('*, providers(display_name), jobs(service_type)')
    .eq('homeowner_id', homeownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const provider = (row.providers as { display_name?: string } | null) ?? null;
    const job = (row.jobs as { service_type?: ServiceType } | null) ?? null;
    return {
      id: row.id as string,
      jobId: row.job_id as string,
      homeownerId: row.homeowner_id as string,
      providerId: row.provider_id as string,
      providerName: provider?.display_name ?? 'Provider',
      serviceType: (job?.service_type ?? 'lawn') as ServiceType,
      incidentType: row.incident_type as IncidentType,
      description: row.description as string,
      photoUrls: (row.photo_urls as string[] | null) ?? [],
      requestedResolution: row.requested_resolution as ResolutionKind,
      requestedAmountCents: (row.requested_amount_cents as number | null) ?? null,
      status: row.status as ClaimStatus,
      resolutionNotes: (row.resolution_notes as string | null) ?? null,
      resolvedAt: (row.resolved_at as string | null) ?? null,
      createdAt: row.created_at as string,
    };
  });
}

export async function get(id: string): Promise<Claim | null> {
  const { data, error } = await supabase
    .from('claims')
    .select('*, providers(display_name), jobs(service_type)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const provider = (data.providers as { display_name?: string } | null) ?? null;
  const job = (data.jobs as { service_type?: ServiceType } | null) ?? null;
  return {
    id: data.id,
    jobId: data.job_id,
    homeownerId: data.homeowner_id,
    providerId: data.provider_id,
    providerName: provider?.display_name ?? 'Provider',
    serviceType: (job?.service_type ?? 'lawn') as ServiceType,
    incidentType: data.incident_type,
    description: data.description,
    photoUrls: data.photo_urls ?? [],
    requestedResolution: data.requested_resolution,
    requestedAmountCents: data.requested_amount_cents,
    status: data.status,
    resolutionNotes: data.resolution_notes,
    resolvedAt: data.resolved_at,
    createdAt: data.created_at,
  };
}
