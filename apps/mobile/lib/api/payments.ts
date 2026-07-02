import { callMock } from '../payments/mockGateway';

// Phase 1: every money operation routes to the mock-payments Edge Function (no Stripe,
// no real charges/payouts). Real Stripe is NOT yet implemented — when going live, build
// the stripe-* Edge Functions and branch here on MOCK_PAYMENTS (see mockGateway.ts).

export function attachPaymentMethod(input: { paymentMethodId: string }) {
  return callMock<{ paymentMethodId: string; brand: string | null; last4: string | null }>(
    'attach-card',
    input,
  );
}

export function createIntent(input: { bookingId: string }) {
  return callMock<{
    paymentIntentId: string;
    status: string;
    amountCents: number;
    applicationFeeCents: number;
    escrowBps: number;
    escrowHoldDays: number;
  }>('create-intent', input);
}

export function captureOnCompletion(input: { jobId: string }) {
  return callMock<{
    paymentIntentId: string;
    status: string;
    escrowAmountCents: number;
  }>('capture', input);
}

export function instantPayout(input: { amountCents?: number }) {
  return callMock<{
    payoutId: string;
    amountCents: number;
    status: string;
    arrivalDate: number;
  }>('instant-payout', input);
}

export function onboardProvider(input: { refreshUrl?: string; returnUrl?: string }) {
  return callMock<{ accountId: string; onboardingUrl: string; expiresAt: number }>(
    'connect-bank',
    input,
  );
}

/** Provider available balance (cents). Mock: sum of captured net minus payouts. */
export function getBalance() {
  return callMock<{ balanceCents: number }>('balance');
}

/** Provider's connected bank account (display only). */
export function getBankAccount() {
  return callMock<{ connected: boolean; bankName?: string; last4?: string; brand?: string }>(
    'bank-account',
  );
}

/** Provider connected-account status (used to gate the banking onboarding step). */
export function getAccountStatus() {
  return callMock<{ connected: boolean }>('get-account');
}
