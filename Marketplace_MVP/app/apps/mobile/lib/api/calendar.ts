import { supabase } from '../supabase';

export async function connect(): Promise<{ authorizeUrl: string }> {
  const { data, error } = await supabase.functions.invoke<{ authorizeUrl: string }>(
    'calendar-connect',
    { body: {} }
  );
  if (error) throw error;
  if (!data) throw new Error('calendar-connect returned no data');
  return data;
}
