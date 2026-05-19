import { supabase } from '../supabase';

export async function register(expoPushToken: string, platform: string): Promise<void> {
  const { error } = await supabase.functions.invoke('register-push-token', {
    body: { expoPushToken, platform },
  });
  if (error) throw error;
}
