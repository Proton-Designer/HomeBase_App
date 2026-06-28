import { supabase } from '../supabase';
import { MOCK_PAYMENTS, callMock } from '../payments/mockGateway';

// While MOCK_PAYMENTS is on, every money operation routes to the fake `mock-payments`
// function (no Stripe). The real `stripe-*` invoke code is kept below each guard, just
// bypassed — flip MOCK_PAYMENTS to false to restore real Stripe.

export async function attachPaymentMethod(input: { paymentMethodId: string }): Promise<{
  paymentMethodId: string;
  brand: string | null;
  last4: string | null;
}> {
  if (MOCK_PAYMENTS) {
    return callMock('attach-card', input);
  }
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
  if (MOCK_PAYMENTS) {
    return callMock('create-intent', input);
  }
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
  if (MOCK_PAYMENTS) {
    return callMock('capture', input);
  }
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
  if (MOCK_PAYMENTS) {
    return callMock('instant-payout', input);
  }
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
  if (MOCK_PAYMENTS) {
    return callMock('connect-bank', input);
  }
  const { data, error } = await supabase.functions.invoke<{
    accountId: string;
    onboardingUrl: string;
    expiresAt: number;
  }>('stripe-onboard-provider', { body: input });
  if (error) throw error;
  if (!data) throw new Error('stripe-onboard-provider returned no data');
  return data;
}

/** Provider available balance (cents). Mock: sum of captured net minus payouts. */
export async function getBalance(): Promise<{ balanceCents: number }> {
  if (MOCK_PAYMENTS) {
    return callMock('balance');
  }
  const { data, error } = await supabase.functions.invoke<{ balanceCents: number }>(
    'stripe-balance',
    {},
  );
  if (error) throw error;
  if (!data) throw new Error('stripe-balance returned no data');
  return data;
}

/** Provider's connected bank account (display only). */
export async function getBankAccount(): Promise<{
  connected: boolean;
  bankName?: string;
  last4?: string;
  brand?: string;
}> {
  if (MOCK_PAYMENTS) {
    return callMock('bank-account');
  }
  const { data, error } = await supabase.functions.invoke<{
    connected: boolean;
    bankName?: string;
    last4?: string;
    brand?: string;
  }>('stripe-bank-account', {});
  if (error) throw error;
  return data ?? { connected: false };
}

/** Provider connected-account status (used to gate the banking onboarding step). */
export async function getAccountStatus(): Promise<{ connected: boolean }> {
  if (MOCK_PAYMENTS) {
    return callMock('get-account');
  }
  const { data, error } = await supabase.functions.invoke<{ connected: boolean }>(
    'stripe-onboard-provider',
    { body: { statusOnly: true } },
  );
  if (error) throw error;
  return data ?? { connected: false };
}
