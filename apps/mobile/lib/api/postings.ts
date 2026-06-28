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

// ─── Custom-job quotes (provider responds to a homeowner posting) ──────────────

export type QuoteStatus = 'sent' | 'accepted' | 'declined' | 'withdrawn';

export interface PostingQuote {
  id: string;
  postingId: string;
  providerId: string;
  amountCents: number | null;
  message: string | null;
  status: QuoteStatus;
  createdAt: string;
  provider?: {
    name: string;
    avatarUrl: string | null;
    verificationTier: number;
    checkInCount: number;
    overall: number;
  };
}

function mapQuote(r: Record<string, unknown>): PostingQuote {
  return {
    id: r.id as string,
    postingId: r.posting_id as string,
    providerId: r.provider_id as string,
    amountCents: (r.amount_cents as number | null) ?? null,
    message: (r.message as string | null) ?? null,
    status: (r.status as QuoteStatus) ?? 'sent',
    createdAt: r.created_at as string,
  };
}

/** Open postings a provider can quote on — filtered to their service types. */
export async function listOpenForProvider(providerId: string): Promise<Posting[]> {
  const { data: prov } = await supabase
    .from('providers')
    .select('service_types')
    .eq('id', providerId)
    .maybeSingle();
  const types = ((prov?.service_types ?? []) as string[]) ?? [];
  // A provider with no service types shouldn't see every posting — show none.
  if (types.length === 0) return [];
  const { data, error } = await supabase
    .from('postings')
    .select(POSTING_COLUMNS)
    .eq('status', 'open')
    .in('service_type', types)
    .order('posted_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as DbPostingRow[]).map(mapPostingRow);
}

/** The provider's own quotes (to show which postings they've already responded to). */
export async function listMyQuotes(providerId: string): Promise<PostingQuote[]> {
  const { data, error } = await supabase
    .from('posting_quotes')
    .select('id, posting_id, provider_id, amount_cents, message, status, created_at')
    .eq('provider_id', providerId);
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapQuote);
}

export async function submitQuote(input: {
  postingId: string;
  providerId: string;
  amountCents?: number | null;
  message?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('posting_quotes').upsert(
    {
      posting_id: input.postingId,
      provider_id: input.providerId,
      amount_cents: input.amountCents ?? null,
      message: input.message ?? null,
      status: 'sent',
    },
    { onConflict: 'posting_id,provider_id' },
  );
  if (error) throw error;
}

/** Quotes on a posting, with provider summary — for the homeowner review screen. */
export async function listQuotes(postingId: string): Promise<PostingQuote[]> {
  const { data, error } = await supabase
    .from('posting_quotes')
    .select(
      'id, posting_id, provider_id, amount_cents, message, status, created_at, ' +
        'providers(display_name, business_name, avatar_url, verification_tier, check_in_count, composite_score_overall)',
    )
    .eq('posting_id', postingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => {
    const p = r.providers as Record<string, unknown> | null;
    return {
      ...mapQuote(r),
      provider: p
        ? {
            name: (p.display_name as string) ?? (p.business_name as string) ?? 'Provider',
            avatarUrl: (p.avatar_url as string | null) ?? null,
            verificationTier: (p.verification_tier as number) ?? 0,
            checkInCount: (p.check_in_count as number) ?? 0,
            overall: (p.composite_score_overall as number) ?? 0,
          }
        : undefined,
    };
  });
}

export async function acceptQuote(input: {
  quoteId: string;
  postingId: string;
  providerId: string;
}): Promise<void> {
  const { error: e1 } = await supabase
    .from('posting_quotes')
    .update({ status: 'accepted' })
    .eq('id', input.quoteId);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from('posting_quotes')
    .update({ status: 'declined' })
    .eq('posting_id', input.postingId)
    .neq('id', input.quoteId);
  if (e2) throw e2;
  const { error: e3 } = await supabase
    .from('postings')
    .update({ status: 'matched', matched_provider_id: input.providerId })
    .eq('id', input.postingId);
  if (e3) throw e3;
}

export async function complete(postingId: string): Promise<void> {
  const { error } = await supabase
    .from('postings')
    .update({ status: 'completed' })
    .eq('id', postingId);
  if (error) throw error;
}

export async function declineQuote(quoteId: string): Promise<void> {
  const { error } = await supabase
    .from('posting_quotes')
    .update({ status: 'declined' })
    .eq('id', quoteId);
  if (error) throw error;
}

/** Homeowner closes their own open posting. */
export async function close(postingId: string): Promise<void> {
  const { error } = await supabase
    .from('postings')
    .update({ status: 'expired' })
    .eq('id', postingId);
  if (error) throw error;
}
