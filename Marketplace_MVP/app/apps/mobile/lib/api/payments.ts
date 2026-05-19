import { supabase } from '../supabase';

export async function attachPaymentMethod(input: { paymentMethodId: string }): Promise<{
  paymentMethodId: string;
  brand: string | null;
  last4: string | null;
}> {
  const { data, error } = await supabase.functions.invoke<{
    paymentMethodId: string;
    brand: string | null;
    last4: string | null;
  }>('stripe-attach-payment-method', { body: input });
  if (error) throw error;
  if (!data) throw new Error('stripe-attach-payment-method returned no data');
  return data;
}

export async function createIntent(input: { bookingId: string }): Promise<{
  paymentIntentId: string;
  status: string;
  amountCents: number;
  applicationFeeCents: number;
  escrowBps: number;
  escrowHoldDays: number;
}> {
  const { data, error } = await supabase.functions.invoke<{
    paymentIntentId: string;
    status: string;
    amountCents: number;
    applicationFeeCents: number;
    escrowBps: number;
    escrowHoldDays: number;
  }>('stripe-create-intent', { body: input });
  if (error) throw error;
  if (!data) throw new Error('stripe-create-intent returned no data');
  return data;
}

export async function captureOnCompletion(input: { jobId: string }): Promise<{
  paymentIntentId: string;
  status: string;
  escrowAmountCents: number;
}> {
  const { data, error } = await supabase.functions.invoke<{
    paymentIntentId: string;
    status: string;
    escrowAmountCents: number;
  }>('stripe-capture-on-completion', { body: input });
  if (error) throw error;
  if (!data) throw new Error('stripe-capture-on-completion returned no data');
  return data;
}

export async function instantPayout(input: { amountCents?: number }): Promise<{
  payoutId: string;
  amountCents: number;
  status: string;
  arrivalDate: number;
}> {
  const { data, error } = await supabase.functions.invoke<{
    payoutId: string;
    amountCents: number;
    status: string;
    arrivalDate: number;
  }>('stripe-instant-payout', { body: input });
  if (error) throw error;
  if (!data) throw new Error('stripe-instant-payout returned no data');
  return data;
}

export async function onboardProvider(input: {
  refreshUrl?: string;
  returnUrl?: string;
}): Promise<{ accountId: string; onboardingUrl: string; expiresAt: number }> {
  const { data, error } = await supabase.functions.invoke<{
    accountId: string;
    onboardingUrl: string;
    expiresAt: number;
  }>('stripe-onboard-provider', { body: input });
  if (error) throw error;
  if (!data) throw new Error('stripe-onboard-provider returned no data');
  return data;
}
