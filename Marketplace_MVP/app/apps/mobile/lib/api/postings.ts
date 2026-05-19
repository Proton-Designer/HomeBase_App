import { supabase } from '../supabase';
import type { Posting, PostingStatus, ServiceType } from '../types';

// Column names verified against the live `postings` table schema (2026-05-18).
type DbPostingRow = {
  id: string;
  homeowner_id: string;
  service_type: string;
  headline: string;
  description: string;
  photo_urls: string[] | null;
  status: string;
  posted_at: string;
  match_count: number | null;
  matched_provider_id: string | null;
};

const POSTING_COLUMNS =
  'id, homeowner_id, service_type, headline, description, photo_urls, status, ' +
  'posted_at, match_count, matched_provider_id';

function mapPostingRow(r: DbPostingRow): Posting {
  return {
    id: r.id,
    serviceType: r.service_type as ServiceType,
    headline: r.headline ?? '',
    description: r.description ?? '',
    photos: r.photo_urls ?? [],
    status: (r.status ?? 'open') as PostingStatus,
    postedAt: r.posted_at,
    matchCount: r.match_count ?? 0,
    matchedProviderId: r.matched_provider_id ?? undefined,
  };
}

export async function create(input: {
  serviceType: ServiceType;
  headline: string;
  description: string;
  photos: string[];
}): Promise<{ id: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('not authenticated');

  const { data, error } = await supabase
    .from('postings')
    .insert({
      homeowner_id: session.user.id,
      service_type: input.serviceType,
      headline: input.headline,
      description: input.description,
      photo_urls: input.photos,
      status: 'open',
      match_count: 0,
      posted_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function listForHomeowner(homeownerId: string): Promise<Posting[]> {
  const { data, error } = await supabase
    .from('postings')
    .select(POSTING_COLUMNS)
    .eq('homeowner_id', homeownerId)
    .order('posted_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as DbPostingRow[]).map(mapPostingRow);
}

export async function get(id: string): Promise<Posting | null> {
  const { data, error } = await supabase
    .from('postings')
    .select(POSTING_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapPostingRow(data as unknown as DbPostingRow);
}
