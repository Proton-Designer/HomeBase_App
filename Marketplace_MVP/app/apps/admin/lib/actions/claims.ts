'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '../supabase-server';

const EDGE_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/release-escrow`;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Calls the release-escrow Edge Function using the signed-in admin's session
 * token so the function's auth check (profiles.role='admin') passes.
 * Falls back to service-role direct invoke if no session is present.
 */
async function callReleaseEscrow(body: object): Promise<void> {
  const cookieStore = await cookies();
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const {
    data: { session },
  } = await supa.auth.getSession();

  const token = session?.access_token ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`release-escrow failed (${res.status}): ${text}`);
  }
}

/**
 * Resolves claim → job → booking → payment chain.
 * Returns the paymentId for the escrow call.
 */
async function resolvePaymentId(claimId: string): Promise<string> {
  // 1. Get the job_id from the claim.
  const { data: claim, error: claimErr } = await supabaseAdmin
    .from('claims')
    .select('job_id')
    .eq('id', claimId)
    .single();

  if (claimErr || !claim?.job_id) {
    throw new Error(`Claim not found or missing job_id: ${claimErr?.message ?? claimId}`);
  }

  // 2. Get the booking_id from the job.
  const { data: job, error: jobErr } = await supabaseAdmin
    .from('jobs')
    .select('booking_id')
    .eq('id', claim.job_id)
    .single();

  if (jobErr || !job?.booking_id) {
    throw new Error(`Job not found or missing booking_id: ${jobErr?.message ?? claim.job_id}`);
  }

  // 3. Get the payment by booking_id.
  const { data: payment, error: payErr } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('booking_id', job.booking_id)
    .single();

  if (payErr || !payment?.id) {
    throw new Error(`Payment not found for booking_id: ${payErr?.message ?? job.booking_id}`);
  }

  return payment.id as string;
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

export async function markUnderReview(formData: FormData): Promise<void> {
  const claimId = formData.get('claimId') as string;
  if (!claimId) throw new Error('claimId is required');

  const { error } = await supabaseAdmin
    .from('claims')
    .update({ status: 'under_review' })
    .eq('id', claimId);

  if (error) throw new Error(`markUnderReview: ${error.message}`);

  revalidatePath('/admin/claims');
}

export async function approveAndRefund(formData: FormData): Promise<void> {
  const claimId = formData.get('claimId') as string;
  const notes = (formData.get('notes') as string | null) ?? '';
  const rawAmount = formData.get('refundAmountCents');

  if (!claimId) throw new Error('claimId is required');

  // Determine refund amount — fall back to requested_amount_cents if not provided.
  let refundAmountCents: number | undefined;
  if (rawAmount !== null && rawAmount !== '') {
    refundAmountCents = Number(rawAmount);
  } else {
    const { data: claim } = await supabaseAdmin
      .from('claims')
      .select('requested_amount_cents')
      .eq('id', claimId)
      .single();
    refundAmountCents = claim?.requested_amount_cents ?? undefined;
  }

  const paymentId = await resolvePaymentId(claimId);

  // Invoke release-escrow: refund_to_homeowner.
  await callReleaseEscrow({
    paymentId,
    direction: 'refund_to_homeowner',
    refundAmountCents,
    claimId,
    reason: 'claim approved',
  });

  const { error } = await supabaseAdmin
    .from('claims')
    .update({
      status: 'approved',
      resolution_notes: notes || null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', claimId);

  if (error) throw new Error(`approveAndRefund DB update: ${error.message}`);

  revalidatePath('/admin/claims');
}

export async function denyClaim(formData: FormData): Promise<void> {
  const claimId = formData.get('claimId') as string;
  const notes = formData.get('notes') as string;

  if (!claimId) throw new Error('claimId is required');
  if (!notes || notes.trim().length < 10) {
    throw new Error('Denial reason must be at least 10 characters');
  }

  const paymentId = await resolvePaymentId(claimId);

  // Invoke release-escrow: release to provider (claim denied).
  await callReleaseEscrow({
    paymentId,
    direction: 'to_provider',
    claimId,
    reason: `claim denied: ${notes}`,
  });

  const { error } = await supabaseAdmin
    .from('claims')
    .update({
      status: 'denied',
      resolution_notes: notes,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', claimId);

  if (error) throw new Error(`denyClaim DB update: ${error.message}`);

  revalidatePath('/admin/claims');
}

export async function markResolved(formData: FormData): Promise<void> {
  const claimId = formData.get('claimId') as string;
  const notes = (formData.get('notes') as string | null) ?? '';

  if (!claimId) throw new Error('claimId is required');

  const { error } = await supabaseAdmin
    .from('claims')
    .update({
      status: 'resolved',
      resolution_notes: notes || null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', claimId);

  if (error) throw new Error(`markResolved: ${error.message}`);

  revalidatePath('/admin/claims');
}
