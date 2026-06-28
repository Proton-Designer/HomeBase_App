# HomeBase — Edge Function secrets

Set these via the Supabase dashboard (`Project Settings → Edge Functions → Secrets`)
**before** flipping `EXPO_PUBLIC_USE_MOCKS=false` in the mobile app.

Project: `HomeBase_MVP` (`rukpypuzfqrswiybvbkg`).

## Always required
| Secret | Used by | Notes |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | every function that needs to bypass RLS for cross-table writes | already provisioned by Supabase, but Edge Functions must reference it explicitly |
| `SHARED_TRUST_SECRET` | `compute-trust-score` | gate the cron caller; any random 32-byte string |

## Stripe (Batch C)
| Secret | Used by |
|---|---|
| `STRIPE_SECRET_KEY` | `stripe-onboard-provider`, `stripe-attach-payment-method`, `stripe-create-intent`, `stripe-capture-on-completion`, `stripe-instant-payout`, `stripe-webhook` |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` (Stripe → Edge Function HMAC verification) |
| `APP_FEE_BPS_ONE_OFF` | `stripe-create-intent` (default 1000 = 10%) |
| `APP_FEE_BPS_SUB` | `stripe-create-intent` (default 1200 = 12%) |
| `ESCROW_BPS` | `stripe-create-intent`, `stripe-capture-on-completion` (default 500 = 5%) |
| `ESCROW_HOLD_DAYS` | `stripe-capture-on-completion` (default 7) |

Stripe dashboard webhook target:
`https://rukpypuzfqrswiybvbkg.supabase.co/functions/v1/stripe-webhook`
Subscribe to: `account.updated`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `payout.paid`, `payout.failed`.

## Anthropic (Batch D)
| Secret | Used by |
|---|---|
| `ANTHROPIC_API_KEY` | `homeowner-checkin`, `provider-checkin`, `generate-trust-rationale` |

Functions are written against `claude-haiku-4-5-20251001`. They fall through to non-AI defaults if the key is unset, so the rest of the app keeps working.

## Telnyx / Resend / Google / Expo (Batch E)
| Secret | Used by |
|---|---|
| `TELNYX_API_KEY` | `send-sms` (V2 API key, format `KEY...`) |
| `TELNYX_FROM_NUMBER` | `send-sms` (E.164, e.g. `+12145551234`) |
| `TELNYX_MESSAGING_PROFILE_ID` | `send-sms` (optional but recommended — your A2P 10DLC campaign anchor) |
| `RESEND_API_KEY` | `send-email` |
| `RESEND_FROM` | `send-email` (default `HomeBase <hello@homebase.app>`) |
| `GOOGLE_CLIENT_ID` | `calendar-connect`, `calendar-sync` |
| `GOOGLE_CLIENT_SECRET` | `calendar-connect`, `calendar-sync` |
| `GOOGLE_REDIRECT_URI` | `calendar-connect` (default `homebase://calendar-callback`) |

**Telnyx setup checklist** (do once, in this order):
1. Sign up at [telnyx.com](https://telnyx.com) (free, no card required to start).
2. Purchase a US number under **Numbers** (~$1/mo for a local number).
3. Create a **Messaging Profile** (Messaging → Messaging Profiles) — name it `HomeBase Transactional`. Copy its ID.
4. Generate a **V2 API key** (Mission Control → API Keys → Create V2 key).
5. Register your **10DLC campaign** (Messaging → 10DLC). Required for US-to-US A2P traffic. Approval takes 1–3 business days.
6. Attach your purchased number to the messaging profile + 10DLC campaign.

Expo Push needs no server credentials — it runs against `https://exp.host` directly.
Push tokens are registered via the `register-push-token` function; the FE captures the token via `expo-notifications.getExpoPushTokenAsync()`.

## Cron (recommended)
Schedule a daily call to `compute-trust-score` for every active provider via `pg_cron`:

```sql
select cron.schedule(
  'recompute-trust-scores-nightly',
  '15 6 * * *',
  $$
  select net.http_post(
    url := 'https://rukpypuzfqrswiybvbkg.supabase.co/functions/v1/compute-trust-score',
    headers := jsonb_build_object('content-type','application/json','x-shared-secret', 'SHARED_TRUST_SECRET_VALUE'),
    body := jsonb_build_object('providerId', id)
  )
  from public.providers where valid_to is null;
  $$
);
```
