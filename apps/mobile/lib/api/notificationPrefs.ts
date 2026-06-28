import { supabase } from '../supabase';

export interface NotificationPrefs {
  jobUpdates: boolean;
  messages: boolean;
  reminders: boolean;
  payouts: boolean;
  marketing: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  jobUpdates: true,
  messages: true,
  reminders: true,
  payouts: true,
  marketing: false,
};

export async function get(userId: string): Promise<NotificationPrefs> {
  const { data, error } = await supabase
    .from('profiles')
    .select('notification_prefs')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return { ...DEFAULT_PREFS, ...((data?.notification_prefs as Partial<NotificationPrefs>) ?? {}) };
}

export async function update(userId: string, prefs: NotificationPrefs): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ notification_prefs: prefs })
    .eq('id', userId);
  if (error) throw error;
}
