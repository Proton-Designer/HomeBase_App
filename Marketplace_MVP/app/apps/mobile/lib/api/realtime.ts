import { supabase } from '../supabase';
import type { JobStatus, UserRole } from '../types';

export type JobStatusListener = (jobId: string, next: JobStatus) => void;
export type IncomingMessage = {
  id: string;
  jobId: string;
  fromUserId: string;
  fromRole: UserRole;
  body: string;
  sentAt: string;
};
export type MessageListener = (msg: IncomingMessage) => void;

export function subscribeToJobStatus(jobId: string, onUpdate: JobStatusListener) {
  const channel = supabase
    .channel(`job:${jobId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` },
      (payload) => {
        const next = (payload.new as { status?: JobStatus }).status;
        if (next) onUpdate(jobId, next);
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToMessages(jobId: string, onMessage: MessageListener) {
  try {
    const channel = supabase
      .channel(`messages:${jobId}`)
      .on(
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
          };
          onMessage({
            id: m.id,
            jobId: m.job_id,
            fromUserId: m.from_user_id,
            fromRole: m.from_role,
            body: m.body,
            sentAt: m.sent_at,
          });
        }
      )
      .subscribe((status, err) => {
        if (err) {
          // eslint-disable-next-line no-console
          console.warn(
            '[realtime] subscribeToMessages failed — messages table may be missing or RLS blocked',
            err,
          );
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[realtime] subscribeToMessages threw — falling back to no-op', err);
    return () => {};
  }
}

export function subscribeToProviderInbox(providerId: string, onNewJob: (jobId: string) => void) {
  const channel = supabase
    .channel(`provider-jobs:${providerId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'jobs', filter: `provider_id=eq.${providerId}` },
      (payload) => {
        const job = payload.new as { id: string };
        onNewJob(job.id);
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToHomeownerJobs(
  homeownerId: string,
  onChange: (jobId: string) => void,
) {
  const channel = supabase
    .channel(`homeowner-jobs:${homeownerId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'jobs', filter: `homeowner_id=eq.${homeownerId}` },
      (payload) => {
        const row = (payload.new ?? payload.old) as { id?: string };
        if (row?.id) onChange(row.id);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
