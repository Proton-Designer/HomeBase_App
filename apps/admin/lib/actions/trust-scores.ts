'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/auth';

// Canonical weights from §6.2 TrustScoreDisplay
const WEIGHTS = {
  reliability: 0.35,
  quality: 0.35,
  communication: 0.2,
  professionalism: 0.1,
} as const;

export type OverrideHistoryRow = {
  id: string;
  adminEmail: string | null;
  prevScores: Record<string, number>;
  newScores: Record<string, number>;
  reason: string;
  createdAt: string;
};

// ---- helpers ---------------------------------------------------------------

function computeOverall(r: {
  reliability: number;
  quality: number;
  communication: number;
  professionalism: number;
}): number {
  return (
    r.reliability * WEIGHTS.reliability +
    r.quality * WEIGHTS.quality +
    r.communication * WEIGHTS.communication +
    r.professionalism * WEIGHTS.professionalism
  );
}

function clampedFloat(raw: FormDataEntryValue | null, field: string): number {
  const v = parseFloat(raw as string);
  if (isNaN(v)) throw new Error(`${field} is not a valid number.`);
  if (v < 0 || v > 5) throw new Error(`${field} must be between 0 and 5.`);
  return Math.round(v * 100) / 100;
}

// ---- server action ---------------------------------------------------------

export async function overrideTrustScore(
  formData: FormData
): Promise<{ error: string | null }> {
  const { profile } = await requireAdmin();

  const providerId = formData.get('providerId');
  const reason = (formData.get('reason') as string | null) ?? '';

  if (!providerId || typeof providerId !== 'string') {
    return { error: 'providerId is required.' };
  }
  if (reason.trim().length < 10) {
    return { error: 'Reason must be at least 10 characters.' };
  }

  let reliability: number;
  let quality: number;
  let communication: number;
  let professionalism: number;

  try {
    reliability = clampedFloat(formData.get('reliability'), 'reliability');
    quality = clampedFloat(formData.get('quality'), 'quality');
    communication = clampedFloat(formData.get('communication'), 'communication');
    professionalism = clampedFloat(formData.get('professionalism'), 'professionalism');
  } catch (err) {
    return { error: (err as Error).message };
  }

  // Fetch current scores for audit log
  const { data: currentRaw, error: fetchErr } = await supabaseAdmin
    .from('providers')
    .select(
      'composite_score_overall, composite_score_reliability, composite_score_quality, ' +
        'composite_score_communication, composite_score_professionalism'
    )
    .eq('id', providerId)
    .single();

  if (fetchErr || !currentRaw) {
    return { error: fetchErr?.message ?? 'Provider not found.' };
  }

  const current = currentRaw as unknown as {
    composite_score_overall: number | null;
    composite_score_reliability: number | null;
    composite_score_quality: number | null;
    composite_score_communication: number | null;
    composite_score_professionalism: number | null;
  };

  const prevScores = {
    overall: current.composite_score_overall ?? 0,
    reliability: current.composite_score_reliability ?? 0,
    quality: current.composite_score_quality ?? 0,
    communication: current.composite_score_communication ?? 0,
    professionalism: current.composite_score_professionalism ?? 0,
  };

  const overall = computeOverall({ reliability, quality, communication, professionalism });

  const newScores = {
    overall: Math.round(overall * 100) / 100,
    reliability,
    quality,
    communication,
    professionalism,
  };

  // Update providers table
  const { error: updateErr } = await supabaseAdmin
    .from('providers')
    .update({
      composite_score_overall: newScores.overall,
      composite_score_reliability: reliability,
      composite_score_quality: quality,
      composite_score_communication: communication,
      composite_score_professionalism: professionalism,
      updated_at: new Date().toISOString(),
    })
    .eq('id', providerId);

  if (updateErr) return { error: updateErr.message };

  // Write audit row
  const { error: auditErr } = await supabaseAdmin
    .from('trust_score_overrides')
    .insert({
      provider_id: providerId,
      admin_id: profile.id,
      prev_scores: prevScores,
      new_scores: newScores,
      reason: reason.trim(),
    });

  if (auditErr) {
    console.error('[overrideTrustScore] audit insert failed:', auditErr.message);
    // Don't roll back the provider update — the override still happened; log the failure.
  }

  revalidatePath('/admin/trust-scores');
  return { error: null };
}

// ---- non-action server function (called from server components) -------------

export async function listOverrideHistory(
  providerId: string
): Promise<OverrideHistoryRow[]> {
  const { data, error } = await supabaseAdmin
    .from('trust_score_overrides')
    .select('id, admin_id, prev_scores, new_scores, reason, created_at')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[listOverrideHistory]', error.message);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Resolve admin emails in one round-trip
  const adminIds = Array.from(new Set(data.map((r) => r.admin_id as string).filter(Boolean)));
  const emailById: Record<string, string | null> = {};
  if (adminIds.length) {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .in('id', adminIds);
    for (const p of profiles ?? []) {
      emailById[p.id] = p.email;
    }
  }

  return data.map((r) => ({
    id: r.id as string,
    adminEmail: emailById[r.admin_id as string] ?? null,
    prevScores: (r.prev_scores ?? {}) as Record<string, number>,
    newScores: (r.new_scores ?? {}) as Record<string, number>,
    reason: r.reason as string,
    createdAt: r.created_at as string,
  }));
}
