import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { JobStatus, UserRole } from '../types';

// supabase.channel() dedupes by topic and returns an already-subscribed channel
// if one with the same topic exists. A second mount of the same screen (tab
// preloading) or a remount before the prior unmount's async removeChannel has
// finished then gets back that subscribed channel, and the following
// .on('postgres_changes', ...) throws "cannot add callbacks after subscribe()".
// Suffixing every topic with a process-unique sequence guarantees a fresh
// channel per subscription, so .on() always runs before subscribe(). The
// postgres_changes filter scopes the data, not the topic name, so correctness
// is unchanged; cleanup removes exactly the channel it created.
let channelSeq = 0;

function openChannel(
  name: string,
  bind: (channel: RealtimeChannel) => RealtimeChannel,
  onError?: (err: unknown) => void,
  onConnect?: () => void,
) {
  channelSeq += 1;
  const channel = bind(supabase.channel(`${name}#${channelSeq}`)).subscribe((status, err) => {
    if (err) onError?.(err);
    // Fires on the initial handshake AND on every reconnect after a network drop —
    // the hook uses this to refetch anything missed while the channel was down.
    if (status === 'SUBSCRIBED') onConnect?.();
  });
  return () => {
    supabase.removeChannel(channel);
  };
}

export type JobStatusListener = (jobId: string, next: JobStatus) => void;
export type IncomingMessage = {
  id: string;
  jobId: string;
  fromUserId: string;
  fromRole: UserRole;
  body: string;
  sentAt: string;
  clientId: string | null;
};
export type MessageListener = (msg: IncomingMessage) => void;

/** Called when a message previously sent by the current user gets `read_at` stamped. */
export type ReadReceiptListener = (messageId: string, readAt: string) => void;

export function subscribeToJobStatus(jobId: string, onUpdate: JobStatusListener) {
  return openChannel(`job:${jobId}`, (channel) =>
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` },
      (payload) => {
        const next = (payload.new as { status?: JobStatus }).status;
        if (next) onUpdate(jobId, next);
      },
    ),
  );
}

export function subscribeToMessages(
  jobId: string,
  onMessage: MessageListener,
  onReadReceipt?: ReadReceiptListener,
  onConnect?: () => void,
) {
  try {
    return openChannel(
      `messages:${jobId}`,
      (channel) => {
        let ch = channel.on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${jobId}` },
          (payload) => {
            const m = payload.new as {
              id: string;
              job_id: string;
              from_user_id: string;
              from_role: UserRole;
              body: string;
              sent_at: string;
              client_id: string | null;
            };
            onMessage({
              id: m.id,
              jobId: m.job_id,
              fromUserId: m.from_user_id,
              fromRole: m.from_role,
              body: m.body,
              sentAt: m.sent_at,
              clientId: m.client_id ?? null,
            });
          },
        );

        // Subscribe to UPDATE events so we can surface read receipts (§6.2).
        ch = ch.on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `job_id=eq.${jobId}` },
          (payload) => {
            const updated = payload.new as { id: string; read_at: string | null };
            const old = payload.old as { read_at?: string | null } | undefined;
            if (updated.read_at && !old?.read_at) {
              onReadReceipt?.(updated.id, updated.read_at);
            }
          },
        );

        return ch;
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn(
          '[realtime] subscribeToMessages failed — messages table may be missing or RLS blocked',
          err,
        );
      },
      onConnect,
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[realtime] subscribeToMessages threw — falling back to no-op', err);
    return () => {};
  }
}

export function subscribeToProviderInbox(providerId: string, onNewJob: (jobId: string) => void) {
  return openChannel(`provider-jobs:${providerId}`, (channel) =>
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'jobs', filter: `provider_id=eq.${providerId}` },
      (payload) => {
        const job = payload.new as { id: string };
        onNewJob(job.id);
      },
    ),
  );
}

export function subscribeToHomeownerJobs(
  homeownerId: string,
  onChange: (jobId: string) => void,
) {
  return openChannel(`homeowner-jobs:${homeownerId}`, (channel) =>
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'jobs', filter: `homeowner_id=eq.${homeownerId}` },
      (payload) => {
        const row = (payload.new ?? payload.old) as { id?: string };
        if (row?.id) onChange(row.id);
      },
    ),
  );
}
