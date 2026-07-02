import { supabase } from '../supabase';
import type { UserRole } from '../types';

export interface Message {
  id: string;
  jobId: string;
  fromUserId: string;
  fromRole: UserRole;
  body: string;
  sentAt: string;
  readAt: string | null;
  clientId: string | null;
}

export interface Thread {
  jobId: string;
  otherPartyName: string;
  otherPartyAvatarUrl: string | null;
  lastPreview: string;
  lastSentAt: string;
  unreadCount: number;
  lastSentByMe: boolean;
  // Job metadata for inbox context line + thread header (§6.1)
  jobServiceType: string | null;
  jobStatus: string | null;
  jobScheduledAt: string | null;
}

type DbMessage = {
  id: string;
  job_id: string;
  from_user_id: string;
  from_role: UserRole;
  body: string;
  sent_at: string;
  read_at: string | null;
  client_id: string | null;
};

const MESSAGE_COLS = 'id, job_id, from_user_id, from_role, body, sent_at, read_at, client_id';

const AUTH_TIMEOUT_MS = 15_000;

// Bound a supabase call that could otherwise hang forever — the auth lock held by a
// stalled refresh, or a fetch that never settles on flaky mobile data. See memory
// note supabase-await-timeout-stalls. On timeout we reject so the caller can recover.
function withTimeout<T>(p: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

function mapMessage(r: DbMessage): Message {
  return {
    id: r.id,
    jobId: r.job_id,
    fromUserId: r.from_user_id,
    fromRole: r.from_role,
    body: r.body,
    sentAt: r.sent_at,
    readAt: r.read_at,
    clientId: r.client_id,
  };
}

// ─── Messages per job ──────────────────────────────────────────────────────

export async function listForJob(jobId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_COLS)
    .eq('job_id', jobId)
    .order('sent_at', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as DbMessage[]).map(mapMessage);
}

/**
 * Keyset-paginated message fetch (§6.5).
 * - No `before`: returns most recent `limit` messages in ascending order.
 * - With `before` (a composite {sentAt,id} cursor): returns messages strictly older
 *   than that point. The id tiebreaker means messages that share a sent_at timestamp
 *   at the page boundary are never silently skipped.
 * - `hasMore` is true when there are more messages before the returned window.
 */
export async function listForJobPage(
  jobId: string,
  options: { before?: { sentAt: string; id: string }; limit?: number } = {},
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const { before, limit = 30 } = options;

  let query = supabase
    .from('messages')
    .select(MESSAGE_COLS)
    .eq('job_id', jobId)
    .order('sent_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (before) {
    // Composite keyset: older sent_at, OR same sent_at with a lower id. Quote the
    // timestamp so its ':' / '+' chars don't confuse the PostgREST filter parser.
    query = query.or(
      `sent_at.lt."${before.sentAt}",and(sent_at.eq."${before.sentAt}",id.lt.${before.id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as DbMessage[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  // Reverse so the caller gets oldest→newest (chronological order for display).
  return { messages: page.reverse().map(mapMessage), hasMore };
}

export async function send(input: {
  jobId: string;
  body: string;
  fromRole: UserRole;
  clientId?: string | null;
}): Promise<Message> {
  // Bound both awaited calls: getSession() takes supabase-js's auth lock and the insert
  // is a network round-trip — either can stall on flaky mobile data and leave the
  // optimistic message stuck in 'sending' forever. On timeout we throw, which deliver()'s
  // catch turns into 'failed' + tap-to-retry. A retry is safe: client_id dedup + the
  // 23505 path below make a re-send idempotent even if the timed-out insert did land.
  const {
    data: { session },
  } = await withTimeout(
    supabase.auth.getSession(),
    AUTH_TIMEOUT_MS,
    'Sending timed out — check your connection and try again.',
  );
  if (!session) throw new Error('not authenticated');

  const { data, error } = await withTimeout(
    supabase
      .from('messages')
      .insert({
        job_id: input.jobId,
        from_user_id: session.user.id,
        from_role: input.fromRole,
        body: input.body.trim(),
        client_id: input.clientId ?? null,
      })
      .select(MESSAGE_COLS)
      .single(),
    AUTH_TIMEOUT_MS,
    'Sending timed out — check your connection and try again.',
  );

  if (error) {
    // Idempotent retry: a unique-violation on (from_user_id, client_id) means
    // this exact message already landed. Return the existing row.
    if (error.code === '23505' && input.clientId) {
      const { data: existing, error: refetchErr } = await supabase
        .from('messages')
        .select(MESSAGE_COLS)
        .eq('from_user_id', session.user.id)
        .eq('client_id', input.clientId)
        .single();
      if (refetchErr) throw refetchErr;
      return mapMessage(existing as unknown as DbMessage);
    }
    throw error;
  }
  return mapMessage(data as unknown as DbMessage);
}

export async function markRead(jobId: string): Promise<void> {
  // Fire-and-forget: bound getSession() so a stalled auth lock can't leak a hanging
  // promise. On timeout just skip — read receipts recover on the next open/refetch.
  let session: { user: { id: string } } | null = null;
  try {
    const res = await withTimeout(
      supabase.auth.getSession(),
      10_000,
      'markRead getSession timeout',
    );
    session = res.data.session;
  } catch {
    return;
  }
  if (!session) return;

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('job_id', jobId)
    .is('read_at', null)
    .neq('from_user_id', session.user.id);
}

// ─── Thread list for inbox screens ────────────────────────────────────────

type DbJobHomeowner = {
  id: string;
  provider_id: string;
  service_type: string | null;
  status: string | null;
  scheduled_at: string | null;
  providers: {
    display_name: string | null;
    business_name: string | null;
    avatar_url: string | null;
  } | null;
};

type DbJobProvider = {
  id: string;
  homeowner_id: string;
  service_type: string | null;
  status: string | null;
  scheduled_at: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
};

export async function listThreadsForHomeowner(homeownerId: string): Promise<Thread[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const currentUserId = session?.user.id ?? null;

  const { data: jobs, error: jobsErr } = await supabase
    .from('jobs')
    .select(
      'id, provider_id, service_type, status, scheduled_at, providers(display_name, business_name, avatar_url)',
    )
    .eq('homeowner_id', homeownerId)
    .order('created_at', { ascending: false });
  if (jobsErr) throw jobsErr;

  const jobIds = ((jobs ?? []) as unknown as DbJobHomeowner[]).map((j) => j.id);
  if (jobIds.length === 0) return [];

  const { data: msgs, error: msgsErr } = await supabase
    .from('messages')
    .select(MESSAGE_COLS)
    .in('job_id', jobIds)
    .order('sent_at', { ascending: false });
  if (msgsErr) throw msgsErr;

  return buildThreadList(
    (jobs ?? []) as unknown as DbJobHomeowner[],
    (msgs ?? []) as unknown as DbMessage[],
    currentUserId,
    (j) => ({
      name: j.providers?.display_name ?? j.providers?.business_name ?? 'Provider',
      avatarUrl: j.providers?.avatar_url ?? null,
      jobServiceType: j.service_type ?? null,
      jobStatus: j.status ?? null,
      jobScheduledAt: j.scheduled_at ?? null,
    }),
  );
}

export async function listThreadsForProvider(providerId: string): Promise<Thread[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const currentUserId = session?.user.id ?? null;

  const { data: jobs, error: jobsErr } = await supabase
    .from('jobs')
    .select(
      'id, homeowner_id, service_type, status, scheduled_at, profiles!jobs_homeowner_id_fkey(first_name, last_name, avatar_url)',
    )
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  if (jobsErr) throw jobsErr;

  const jobIds = ((jobs ?? []) as unknown as DbJobProvider[]).map((j) => j.id);
  if (jobIds.length === 0) return [];

  const { data: msgs, error: msgsErr } = await supabase
    .from('messages')
    .select(MESSAGE_COLS)
    .in('job_id', jobIds)
    .order('sent_at', { ascending: false });
  if (msgsErr) throw msgsErr;

  return buildThreadList(
    (jobs ?? []) as unknown as DbJobProvider[],
    (msgs ?? []) as unknown as DbMessage[],
    currentUserId,
    (j) => ({
      name:
        [(j as DbJobProvider).profiles?.first_name, (j as DbJobProvider).profiles?.last_name]
          .filter(Boolean)
          .join(' ')
          .trim() || 'Homeowner',
      avatarUrl: (j as DbJobProvider).profiles?.avatar_url ?? null,
      jobServiceType: j.service_type ?? null,
      jobStatus: j.status ?? null,
      jobScheduledAt: j.scheduled_at ?? null,
    }),
  );
}

type JobMeta = { id: string; service_type?: string | null; status?: string | null; scheduled_at?: string | null };

function buildThreadList<J extends JobMeta>(
  jobs: J[],
  msgs: DbMessage[],
  currentUserId: string | null,
  resolveOther: (job: J) => {
    name: string;
    avatarUrl: string | null;
    jobServiceType: string | null;
    jobStatus: string | null;
    jobScheduledAt: string | null;
  },
): Thread[] {
  const lastByJob = new Map<string, DbMessage>();
  const unreadByJob = new Map<string, number>();
  for (const m of msgs) {
    if (!lastByJob.has(m.job_id)) lastByJob.set(m.job_id, m);
    if (currentUserId && m.from_user_id !== currentUserId && !m.read_at) {
      unreadByJob.set(m.job_id, (unreadByJob.get(m.job_id) ?? 0) + 1);
    }
  }

  return jobs
    .filter((j) => lastByJob.has(j.id))
    .map((j) => {
      const last = lastByJob.get(j.id)!;
      const other = resolveOther(j);
      return {
        jobId: j.id,
        otherPartyName: other.name,
        otherPartyAvatarUrl: other.avatarUrl,
        lastPreview: last.body,
        lastSentAt: last.sent_at,
        unreadCount: unreadByJob.get(j.id) ?? 0,
        lastSentByMe: currentUserId ? last.from_user_id === currentUserId : false,
        jobServiceType: other.jobServiceType,
        jobStatus: other.jobStatus,
        jobScheduledAt: other.jobScheduledAt,
      };
    })
    .sort((a, b) => (a.lastSentAt < b.lastSentAt ? 1 : -1));
}
