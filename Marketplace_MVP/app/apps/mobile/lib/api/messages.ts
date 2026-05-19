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
}

export interface Thread {
  jobId: string;
  otherPartyName: string;
  otherPartyAvatarUrl: string | null;
  lastPreview: string;
  lastSentAt: string;
  unreadCount: number;
}

type DbMessage = {
  id: string;
  job_id: string;
  from_user_id: string;
  from_role: UserRole;
  body: string;
  sent_at: string;
  read_at: string | null;
};

function mapMessage(r: DbMessage): Message {
  return {
    id: r.id,
    jobId: r.job_id,
    fromUserId: r.from_user_id,
    fromRole: r.from_role,
    body: r.body,
    sentAt: r.sent_at,
    readAt: r.read_at,
  };
}

// ─── Messages per job ──────────────────────────────────────────────────────

export async function listForJob(jobId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, job_id, from_user_id, from_role, body, sent_at, read_at')
    .eq('job_id', jobId)
    .order('sent_at', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as DbMessage[]).map(mapMessage);
}

export async function send(input: {
  jobId: string;
  body: string;
  fromRole: UserRole;
}): Promise<Message> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('not authenticated');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      job_id: input.jobId,
      from_user_id: session.user.id,
      from_role: input.fromRole,
      body: input.body.trim(),
    })
    .select('id, job_id, from_user_id, from_role, body, sent_at, read_at')
    .single();

  if (error) throw error;
  return mapMessage(data as unknown as DbMessage);
}

export async function markRead(jobId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('job_id', jobId)
    .is('read_at', null)
    .neq('from_user_id', session.user.id);
}

// ─── Thread list for inbox screens ────────────────────────────────────────

export async function listThreadsForHomeowner(homeownerId: string): Promise<Thread[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const currentUserId = session?.user.id ?? null;

  // Pull every job the homeowner is on + its provider's display info.
  const { data: jobs, error: jobsErr } = await supabase
    .from('jobs')
    .select('id, provider_id, providers(display_name, business_name, avatar_url)')
    .eq('homeowner_id', homeownerId)
    .order('created_at', { ascending: false });
  if (jobsErr) throw jobsErr;

  const jobIds = (jobs ?? []).map((j) => (j as unknown as { id: string }).id);
  if (jobIds.length === 0) return [];

  const { data: msgs, error: msgsErr } = await supabase
    .from('messages')
    .select('id, job_id, from_user_id, from_role, body, sent_at, read_at')
    .in('job_id', jobIds)
    .order('sent_at', { ascending: false });
  if (msgsErr) throw msgsErr;

  return buildThreadList(
    jobs as unknown as Array<{
      id: string;
      providers: { display_name: string | null; business_name: string | null; avatar_url: string | null } | null;
    }>,
    (msgs ?? []) as unknown as DbMessage[],
    currentUserId,
    (j) => ({
      name: j.providers?.display_name ?? j.providers?.business_name ?? 'Provider',
      avatarUrl: j.providers?.avatar_url ?? null,
    })
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
      'id, homeowner_id, profiles!jobs_homeowner_id_fkey(first_name, last_name, avatar_url)'
    )
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  if (jobsErr) throw jobsErr;

  const jobIds = (jobs ?? []).map((j) => (j as unknown as { id: string }).id);
  if (jobIds.length === 0) return [];

  const { data: msgs, error: msgsErr } = await supabase
    .from('messages')
    .select('id, job_id, from_user_id, from_role, body, sent_at, read_at')
    .in('job_id', jobIds)
    .order('sent_at', { ascending: false });
  if (msgsErr) throw msgsErr;

  return buildThreadList(
    jobs as unknown as Array<{
      id: string;
      profiles: { first_name: string | null; last_name: string | null; avatar_url: string | null } | null;
    }>,
    (msgs ?? []) as unknown as DbMessage[],
    currentUserId,
    (j) => ({
      name:
        [j.profiles?.first_name, j.profiles?.last_name].filter(Boolean).join(' ').trim() ||
        'Homeowner',
      avatarUrl: j.profiles?.avatar_url ?? null,
    })
  );
}

function buildThreadList<J extends { id: string }>(
  jobs: J[],
  msgs: DbMessage[],
  currentUserId: string | null,
  resolveOther: (job: J) => { name: string; avatarUrl: string | null }
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
      };
    })
    .sort((a, b) => (a.lastSentAt < b.lastSentAt ? 1 : -1));
}
