import { invokeFn } from './functions';
import { supabase } from '../supabase';

export async function register(expoPushToken: string, platform: string): Promise<void> {
  await invokeFn('register-push-token', { expoPushToken, platform });
}

export type NotificationType =
  | 'booking_matched'
  | 'booking_confirmed'
  | 'booking_declined'
  | 'booking_cancelled'
  | 'job_completed_checkin'
  | 'checkin_reminder'
  | 'payout_sent'
  | 'instant_payout_ready'
  | 'claim_update'
  | 'verification_approved'
  | 'new_message'
  | 'quote_received'
  | 'reminder_due'
  | string;

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  sentAt: string;
}

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  sent_at: string;
}

function mapRow(r: NotificationRow): AppNotification {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    data: r.data ?? {},
    readAt: r.read_at,
    sentAt: r.sent_at,
  };
}

/** Newest 50 notifications for the signed-in user (RLS scopes to auth.uid()). */
export async function list(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, data, read_at, sent_at')
    .order('sent_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as NotificationRow[]).map(mapRow);
}

/** Unread count — drives the bell badge. */
export async function unreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);
  if (error) throw error;
}

export async function markAllRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
}
