import { supabase } from '../supabase';
import type { CrewMember, TeamStatus } from '../types';

export async function listForProvider(providerId: string): Promise<CrewMember[]> {
  const { data, error } = await supabase
    .from('provider_team')
    .select('id, provider_id, user_id, role, status, invited_at, joined_at, removed_at, profiles(first_name, last_name, email, phone, avatar_url)')
    .eq('provider_id', providerId)
    .order('invited_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const profile = (row.profiles as { first_name?: string; last_name?: string; email?: string; phone?: string; avatar_url?: string } | null) ?? null;
    return {
      id: row.id as string,
      providerId: row.provider_id as string,
      userId: row.user_id as string,
      firstName: profile?.first_name ?? '',
      lastName: profile?.last_name ?? '',
      email: profile?.email ?? '',
      phone: profile?.phone ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      role: row.role as 'owner' | 'tech',
      status: row.status as TeamStatus,
      invitedAt: row.invited_at as string,
      joinedAt: (row.joined_at as string | null) ?? null,
      removedAt: (row.removed_at as string | null) ?? null,
    };
  });
}

export async function invite(input: {
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<{ id: string }> {
  const { data, error } = await supabase.functions.invoke<{ id: string }>('crew-invite', {
    body: input,
  });
  if (error) throw error;
  return data!;
}

export async function remove(membershipId: string): Promise<void> {
  const { error } = await supabase
    .from('provider_team')
    .update({ status: 'removed', removed_at: new Date().toISOString() })
    .eq('id', membershipId);
  if (error) throw error;
}

export async function assignToJob(jobId: string, techUserId: string | null): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update({ assigned_tech_id: techUserId })
    .eq('id', jobId);
  if (error) throw error;
}
