// mock-payments — Phase-1 FAKE money system. No Stripe, no real charges/payouts.
// Writes the real DB rows (payments, payment_methods, completion_ledger, stripe_accounts,
// payouts) via the SERVICE ROLE so ledger/earnings integrity is preserved, but every
// Stripe call is faked. The real stripe-* functions remain deployed and are simply bypassed
// (client routes here while MOCK_PAYMENTS is on). Remove/disable for real Stripe in phase 2.
//
// Deployed via Supabase MCP. This file is the version-controlled source of truth.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// HomeBase take rate: 10% on subscriptions, 17.5% on one-offs.
function feeBps(bookingType: string): number {
  return bookingType === "subscription" ? 1000 : 1750;
}

async function providerForUser(admin: ReturnType<typeof createClient>, userId: string) {
  const { data } = await admin.from("providers").select("id").eq("owner_user_id", userId).maybeSingle();
  return data;
}

// Available balance = sum(captured net) − already paid out. net = amount − application fee.
async function availableCents(admin: ReturnType<typeof createClient>, providerId: string) {
  const { data: pays } = await admin
    .from("payments")
    .select("amount_cents, application_fee_cents")
    .eq("provider_id", providerId)
    .eq("status", "succeeded");
  const earned = (pays ?? []).reduce(
    (s: number, p: { amount_cents: number; application_fee_cents: number | null }) =>
      s + (p.amount_cents - (p.application_fee_cents ?? 0)),
    0,
  );
  const { data: outs } = await admin.from("payouts").select("amount_cents").eq("provider_id", providerId);
  const paidOut = (outs ?? []).reduce((s: number, p: { amount_cents: number }) => s + p.amount_cents, 0);
  return Math.max(0, earned - paidOut);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(URL, SERVICE);
  const body = await req.json().catch(() => ({}));
  const op = String(body.op ?? "");

  try {
    switch (op) {
      // ── Provider: connect bank (fake Stripe Connect) ────────────────────────
      case "connect-bank":
      case "onboard-provider": {
        const provider = await providerForUser(admin, user.id);
        if (!provider) return json({ error: "No provider profile found" }, 400);
        const acct = {
          provider_id: provider.id,
          stripe_account_id: `acct_mock_${String(provider.id).slice(0, 8)}`,
          status: "active",
          payouts_enabled: true,
          charges_enabled: true,
          details_submitted: true,
          instant_payouts_eligible: true,
          default_external_account: "Test Bank ****6789",
        };
        const { data: existing } = await admin
          .from("stripe_accounts")
          .select("id")
          .eq("provider_id", provider.id)
          .maybeSingle();
        if (existing) await admin.from("stripe_accounts").update(acct).eq("id", existing.id);
        else await admin.from("stripe_accounts").insert(acct);
        return json({
          connected: true,
          accountId: acct.stripe_account_id,
          status: "active",
          onboardingUrl: "mock://connected",
          expiresAt: Date.now() + 3_600_000,
        });
      }

      case "get-account": {
        const provider = await providerForUser(admin, user.id);
        if (!provider) return json({ connected: false });
        const { data: acct } = await admin
          .from("stripe_accounts")
          .select("status, payouts_enabled, instant_payouts_eligible")
          .eq("provider_id", provider.id)
          .maybeSingle();
        return json({ connected: !!acct?.payouts_enabled, account: acct ?? null });
      }

      case "bank-account": {
        const provider = await providerForUser(admin, user.id);
        if (!provider) return json({ connected: false });
        const { data: acct } = await admin
          .from("stripe_accounts")
          .select("id")
          .eq("provider_id", provider.id)
          .maybeSingle();
        if (!acct) return json({ connected: false });
        return json({ connected: true, bankName: "Test Bank", last4: "6789", brand: "checking" });
      }

      case "balance": {
        const provider = await providerForUser(admin, user.id);
        if (!provider) return json({ balanceCents: 0 });
        return json({ balanceCents: await availableCents(admin, String(provider.id)) });
      }

      // ── Homeowner: add a fake card ──────────────────────────────────────────
      case "attach-card": {
        const card = {
          homeowner_id: user.id,
          stripe_customer_id: `cus_mock_${user.id.slice(0, 8)}`,
          stripe_payment_method_id: `pm_mock_${crypto.randomUUID().slice(0, 8)}`,
          brand: "Visa",
          last4: "4242",
          exp_month: 12,
          exp_year: 2030,
          is_default: true,
        };
        await admin.from("payment_methods").update({ is_default: false }).eq("homeowner_id", user.id);
        const { data: inserted, error } = await admin
          .from("payment_methods")
          .insert(card)
          .select("id, brand, last4")
          .single();
        if (error) return json({ error: error.message }, 400);
        return json({ paymentMethodId: inserted.id, brand: inserted.brand, last4: inserted.last4 });
      }

      // ── Homeowner: authorize a booking (no real charge) ─────────────────────
      case "create-intent": {
        const bookingId = String(body.bookingId ?? "");
        const { data: booking } = await admin
          .from("bookings")
          .select("id, homeowner_id, provider_id, amount_cents, booking_type")
          .eq("id", bookingId)
          .maybeSingle();
        if (!booking) return json({ error: "Booking not found" }, 400);
        // Only the booking's homeowner may authorize/pay for it.
        if (booking.homeowner_id !== user.id) return json({ error: "Forbidden" }, 403);
        const bps = feeBps(booking.booking_type);
        const applicationFeeCents = Math.round((booking.amount_cents * bps) / 10000);
        const { data: inserted, error } = await admin
          .from("payments")
          .insert({
            booking_id: booking.id,
            homeowner_id: booking.homeowner_id,
            provider_id: booking.provider_id,
            stripe_payment_intent_id: `pi_mock_${crypto.randomUUID().slice(0, 8)}`,
            amount_cents: booking.amount_cents,
            application_fee_cents: applicationFeeCents,
            status: "requires_capture",
            authorized_at: new Date().toISOString(),
          })
          .select("id, stripe_payment_intent_id, status")
          .single();
        if (error) return json({ error: error.message }, 400);
        await admin.from("bookings").update({ primary_payment_id: inserted.id }).eq("id", booking.id);
        return json({
          paymentIntentId: inserted.stripe_payment_intent_id,
          status: inserted.status,
          amountCents: booking.amount_cents,
          applicationFeeCents,
          escrowBps: 0,
          escrowHoldDays: 0,
        });
      }

      // ── Completion: capture funds + write the verified-completion ledger ────
      case "capture": {
        const jobId = String(body.jobId ?? "");
        const { data: job } = await admin
          .from("jobs")
          .select("id, booking_id, provider_id, homeowner_id, service_type, amount_cents")
          .eq("id", jobId)
          .maybeSingle();
        if (!job) return json({ error: "Job not found" }, 400);
        // Only a participant in this job (its provider or its homeowner) may capture it.
        const capProvider = await providerForUser(admin, user.id);
        if (job.homeowner_id !== user.id && job.provider_id !== capProvider?.id) {
          return json({ error: "Forbidden" }, 403);
        }
        const { data: payment } = await admin
          .from("payments")
          .select("id, stripe_payment_intent_id, amount_cents, application_fee_cents, status")
          .eq("booking_id", job.booking_id)
          .order("created_at", { ascending: false })
          .maybeSingle();
        if (payment && payment.status !== "succeeded") {
          await admin
            .from("payments")
            .update({ status: "succeeded", captured_at: new Date().toISOString(), job_id: job.id })
            .eq("id", payment.id);
        }
        const { data: existingLedger } = await admin
          .from("completion_ledger")
          .select("id")
          .eq("job_id", job.id)
          .maybeSingle();
        if (!existingLedger) {
          const grossCents = payment?.amount_cents ?? job.amount_cents;
          // Store the real net (gross − captured platform fee) so the client never has to
          // guess a flat rate; the fee already encodes 10% (subscription) vs 17.5% (one-off).
          const netCents =
            payment != null ? grossCents - (payment.application_fee_cents ?? 0) : null;
          await admin.from("completion_ledger").insert({
            job_id: job.id,
            provider_id: job.provider_id,
            homeowner_id: job.homeowner_id,
            service_type: job.service_type,
            completed_at: new Date().toISOString(),
            check_in_passed: true,
            amount_cents: grossCents,
            net_cents: netCents,
          });
        }
        return json({
          paymentIntentId: payment?.stripe_payment_intent_id ?? "pi_mock",
          status: "succeeded",
          escrowAmountCents: 0,
        });
      }

      // ── Provider: instant cash-out (fake) ───────────────────────────────────
      case "instant-payout": {
        const provider = await providerForUser(admin, user.id);
        if (!provider) return json({ error: "No provider profile" }, 400);
        const available = await availableCents(admin, String(provider.id));
        const amount = body.amountCents ? Math.min(Number(body.amountCents), available) : available;
        if (amount <= 0) return json({ error: "No funds available to cash out yet." }, 400);
        const fee = Math.max(50, Math.round(amount * 0.01));
        const { data: payout, error } = await admin
          .from("payouts")
          .insert({
            provider_id: provider.id,
            stripe_payout_id: `po_mock_${crypto.randomUUID().slice(0, 8)}`,
            amount_cents: amount,
            fee_cents: fee,
            net_cents: amount - fee,
            kind: "instant",
            status: "paid",
            arrival_date: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (error) return json({ error: error.message }, 400);
        return json({
          payoutId: payout.id,
          amountCents: amount,
          status: "paid",
          arrivalDate: Math.floor(Date.now() / 1000),
        });
      }

      default:
        return json({ error: `Unknown op: ${op}` }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "mock-payments error" }, 500);
  }
});
