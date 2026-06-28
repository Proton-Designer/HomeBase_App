# HomeBase Backend & RLS Audit

**Date:** 2026-06-23
**Scope:** `apps/mobile/lib/api/**`, `docs/guides/BACKEND_GUIDE.md` (schema + RLS spec), inferred live schema from client call patterns.
**Method:** Read-only. No DB queries executed. Findings derived from code + spec cross-reference.

---

## Executive Summary

The schema design is sound overall — clear tenant boundaries (homeowners vs providers), temporal columns present on key tables, and the completion/demand data hooks are wired. However, there are **five categories of exploitable or blocking issues** that must be resolved before production:

1. `auth.uid()` called inline (not `(select auth.uid())`) in several policies → `auth_rls_initplan` performance trap
2. Multiple permissive SELECT policies on `providers` create a `multiple_permissive_policies` advisor warning and allow an unauthenticated homeowner to read every provider's `stripe_account_id` and internal fields
3. Several live tables (`jobs`, `postings`, `messages`, `home_service_status`, `addresses`, `provider_team`, `completion_ledger`) have **no RLS policies at all** in the spec, yet are queried by the client with the anon/user JWT
4. Direct client writes bypass business-logic guards (subscription state machine, crew removal)
5. `get_eligible_providers` is a `LANGUAGE sql STABLE` function called via `supabase.rpc()` — it is implicitly `SECURITY INVOKER`, which is correct, but any future SECURITY DEFINER helper functions should be in a `private` schema

---

## Finding Catalogue

### F-1 — `auth_rls_initplan`: Inline `auth.uid()` in correlated policies (HIGH)

**Supabase Advisor class:** `auth_rls_initplan`

**What it is:** When `auth.uid()` appears directly in a policy expression, Postgres evaluates it once per row (it is not cached for the query). Using `(select auth.uid())` promotes it to a stable sub-select that Postgres can evaluate once per statement (init-plan), cutting per-row overhead dramatically on large tables.

**Affected policies in spec (018_rls.sql):**

| Policy | Table | Bad expression |
|---|---|---|
| `profiles_read_own` | profiles | `id = auth.uid()` |
| `profiles_update_own` | profiles | `id = auth.uid()` |
| `notifications_read_own` | notifications | `user_id = auth.uid()` |
| `notifications_update_own` | notifications | `user_id = auth.uid()` |
| `homeowner_insert_checkin` | check_ins | `submitted_by_user_id = auth.uid()` |

Policies that already use `(SELECT id FROM ... WHERE user_id = auth.uid())` partially mitigate this, but the scalar `auth.uid()` still appears inside sub-selects at lines 652, 662, 672 in the spec — these are fine because they are already inside a sub-select with `WHERE h.user_id = auth.uid()`. Only the direct comparisons above need fixing.

**Safe remediation (ordered):**

```sql
-- Step 1: Drop and recreate affected policies
-- profiles
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
CREATE POLICY "profiles_read_own"
  ON profiles FOR SELECT
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = (SELECT auth.uid()));

-- notifications
DROP POLICY IF EXISTS "notifications_read_own" ON notifications;
CREATE POLICY "notifications_read_own"
  ON notifications FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

-- check_ins insert
DROP POLICY IF EXISTS "homeowner_insert_checkin" ON check_ins;
CREATE POLICY "homeowner_insert_checkin"
  ON check_ins FOR INSERT
  WITH CHECK (
    submitted_by_user_id = (SELECT auth.uid()) AND
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN homeowners h ON h.id = b.homeowner_id
      WHERE h.user_id = (SELECT auth.uid())
    )
  );
```

---

### F-2 — `multiple_permissive_policies`: Duplicate SELECT on `providers` leaks internal fields (HIGH)

**Supabase Advisor class:** `multiple_permissive_policies`

**What it is:** Two SELECT policies on `providers` both evaluate for an authenticated provider user:
- `providers_read_own` — returns their own row (including `stripe_account_id`, `stripe_onboarding_complete`)
- `providers_public_read_active` — returns all active providers (also includes their own row)

For the `USING (true)` trust_scores policies this is benign. For providers it is not: any authenticated user (including homeowners) who can query `providers` with `status = 'active'` gets full rows including `stripe_account_id`. Stripe account IDs are considered sensitive — they are enough to initiate transfers via your own Stripe key.

Additionally, Postgres evaluates both policies with OR semantics, meaning an authenticated provider row will be returned by EITHER matching policy, which hits the Supabase advisor warning.

**Safe remediation:**

```sql
-- Step 1: Drop both SELECT policies
DROP POLICY IF EXISTS "providers_read_own" ON providers;
DROP POLICY IF EXISTS "providers_public_read_active" ON providers;

-- Step 2: Single consolidated policy with column-level visibility split via view (preferred)
-- Create a public view that excludes sensitive columns
CREATE OR REPLACE VIEW public.providers_public AS
  SELECT
    id, business_name, display_name, bio, avatar_url,
    verification_tier, status,
    composite_score_overall, composite_score_reliability,
    composite_score_quality, composite_score_communication,
    composite_score_professionalism,
    check_in_count, service_types, portfolio_photos,
    price_range_min_cents, price_range_max_cents, is_available_today
  FROM providers
  WHERE status = 'active';

-- Homeowners and public search use providers_public view (no RLS needed, no sensitive cols).
-- Provider owners still query the base table with a single scoped policy:
CREATE POLICY "providers_read_own"
  ON providers FOR SELECT
  USING (owner_user_id = (SELECT auth.uid()));

-- NOTE: If a view-based approach is not feasible immediately, at minimum consolidate:
-- DROP the two conflicting policies and replace with one:
CREATE POLICY "providers_select"
  ON providers FOR SELECT
  USING (
    status = 'active'                              -- any authenticated user sees active rows
    OR owner_user_id = (SELECT auth.uid())         -- owner sees their own row regardless of status
  );
-- This does NOT fix the column leakage but fixes the multiple_permissive_policies advisor warning.
```

---

### F-3 — Missing RLS coverage on live tables (CRITICAL)

The following tables are **queried directly by the mobile client via the user JWT** but have no RLS policies in the spec. If RLS is enabled but no policy grants access, every query returns zero rows (silent breakage). If RLS was never enabled, every row is world-readable.

| Table | Client query pattern | Risk if RLS enabled + no policy | Risk if RLS not enabled |
|---|---|---|---|
| `jobs` | `.eq('homeowner_id', x)`, `.eq('provider_id', x)`, `.eq('assigned_tech_id', x)` | Returns 0 rows silently | All jobs world-readable |
| `postings` | `.eq('homeowner_id', x)` | Returns 0 rows | All postings world-readable (PII in description) |
| `messages` | `.eq('job_id', x)`, `.in('job_id', [...])` | Returns 0 rows | All messages world-readable (severe privacy breach) |
| `home_service_status` | `.eq('homeowner_id', x)` | Returns 0 rows | Service history world-readable |
| `addresses` | `.eq('id', x)` | Returns 0 rows | All home addresses world-readable (severe) |
| `provider_team` | `.eq('provider_id', x)` | Returns 0 rows | Crew PII exposed |
| `completion_ledger` | `.eq('homeowner_id', x)` | Returns 0 rows | All ledger entries world-readable |

`demand_events` and `provider_blocked_times` are also missing from the spec's ENABLE RLS block.

**Safe remediation (ordered — add RLS enable + policies for each table):**

```sql
-- ============================================================
-- JOBS  (tenant: homeowner_id, provider_id, assigned_tech_id)
-- ============================================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_homeowner_select"
  ON jobs FOR SELECT
  USING (homeowner_id = (
    SELECT id FROM homeowners WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "jobs_provider_select"
  ON jobs FOR SELECT
  USING (provider_id = (
    SELECT id FROM providers WHERE owner_user_id = (SELECT auth.uid())
  ));

-- Tech crew can see jobs assigned to them
CREATE POLICY "jobs_tech_select"
  ON jobs FOR SELECT
  USING (assigned_tech_id = (SELECT auth.uid()));

-- Status transitions come from Edge Functions (service role), so no INSERT/UPDATE policies needed.

-- ============================================================
-- POSTINGS
-- ============================================================
ALTER TABLE postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "postings_homeowner_all"
  ON postings FOR ALL
  USING (homeowner_id = (SELECT auth.uid()));

-- ============================================================
-- MESSAGES  (scoped to jobs the caller is a party to)
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select"
  ON messages FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM jobs
      WHERE homeowner_id = (SELECT id FROM homeowners WHERE user_id = (SELECT auth.uid()))
         OR provider_id  = (SELECT id FROM providers WHERE owner_user_id = (SELECT auth.uid()))
         OR assigned_tech_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "messages_insert"
  ON messages FOR INSERT
  WITH CHECK (
    from_user_id = (SELECT auth.uid()) AND
    job_id IN (
      SELECT id FROM jobs
      WHERE homeowner_id = (SELECT id FROM homeowners WHERE user_id = (SELECT auth.uid()))
         OR provider_id  = (SELECT id FROM providers WHERE owner_user_id = (SELECT auth.uid()))
         OR assigned_tech_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "messages_update_own"
  ON messages FOR UPDATE
  USING (from_user_id = (SELECT auth.uid()));  -- for markRead (sets read_at on others' messages)
-- NOTE: markRead() updates rows where from_user_id != current user, so this UPDATE
-- policy needs adjustment. Consider a SECURITY DEFINER edge function for markRead instead.

-- ============================================================
-- HOME_SERVICE_STATUS
-- ============================================================
ALTER TABLE home_service_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "home_service_status_own"
  ON home_service_status FOR ALL
  USING (homeowner_id = (SELECT auth.uid()));

-- ============================================================
-- ADDRESSES
-- ============================================================
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Homeowners can manage their own addresses
CREATE POLICY "addresses_homeowner_all"
  ON addresses FOR ALL
  USING (
    id IN (
      SELECT primary_address_id FROM homeowners WHERE user_id = (SELECT auth.uid())
      -- If addresses has a homeowner_id FK column, use that directly instead
    )
  );
-- NOTE: If addresses.homeowner_id exists as a FK column (likely, given the API pattern),
-- use: USING (homeowner_id = (SELECT id FROM homeowners WHERE user_id = (SELECT auth.uid())))

-- Providers need to read addresses for jobs assigned to them (via Edge Function / service role
-- is preferred; avoid broadening this policy further).

-- ============================================================
-- PROVIDER_TEAM
-- ============================================================
ALTER TABLE provider_team ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own team
CREATE POLICY "provider_team_owner_all"
  ON provider_team FOR ALL
  USING (provider_id = (
    SELECT id FROM providers WHERE owner_user_id = (SELECT auth.uid())
  ));

-- Tech can read their own membership row
CREATE POLICY "provider_team_tech_select"
  ON provider_team FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- COMPLETION_LEDGER  (was intentionally service-role only in spec)
-- But fetchHomeownerCompletions() queries it directly with user JWT.
-- ============================================================
ALTER TABLE completion_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "completion_ledger_homeowner_select"
  ON completion_ledger FOR SELECT
  USING (homeowner_id = (SELECT auth.uid()));
-- If completion_ledger.homeowner_id stores auth.users.id (not homeowners.id), this is correct.
-- If it stores homeowners.id, adjust:
-- USING (homeowner_id = (SELECT id FROM homeowners WHERE user_id = (SELECT auth.uid())))

-- ============================================================
-- DEMAND_EVENTS  (write-only from client, no reads)
-- ============================================================
ALTER TABLE demand_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demand_events_insert"
  ON demand_events FOR INSERT
  WITH CHECK (true);  -- any authenticated (or anon) user can write a search event

-- No SELECT policy — analytics only via service role / admin.

-- ============================================================
-- PROVIDER_BLOCKED_TIMES  (already has client CRUD in api/providers.ts)
-- ============================================================
ALTER TABLE provider_blocked_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_blocked_times_own"
  ON provider_blocked_times FOR ALL
  USING (provider_id = (
    SELECT id FROM providers WHERE owner_user_id = (SELECT auth.uid())
  ));
```

---

### F-4 — Direct client writes bypass business-logic guards (MEDIUM)

Several mutations happen directly from the client (anon/user JWT), not through Edge Functions, meaning they skip server-side validation:

| Code location | Table | Direct mutation | Guard bypassed |
|---|---|---|---|
| `jobs.ts:setStatus()` | `jobs` | `.update({ status })` | Status machine (e.g., can skip `confirmed` → jump to `completed`) |
| `crew.ts:remove()` | `provider_team` | `.update({ status: 'removed' })` | No check that caller is the team owner; tech could remove others |
| `subscriptions.ts:pause/resume/cancel/changeFrequency()` | `subscriptions` | Direct `.update()` | No validation of allowed state transitions |
| `providers.ts:saveServiceArea()` | `provider_service_areas` | `delete().insert()` | Race condition — delete then insert is not atomic; no FK validation |

**Safe remediation:**

```sql
-- For jobs.setStatus: RLS UPDATE policy that restricts which status values are allowed:
CREATE POLICY "jobs_provider_update_status"
  ON jobs FOR UPDATE
  USING (provider_id = (
    SELECT id FROM providers WHERE owner_user_id = (SELECT auth.uid())
  ))
  WITH CHECK (status IN ('en_route', 'in_progress'));
  -- completed/cancelled must go through Edge Functions only

-- For provider_team remove: RLS already requires caller to be owner (from F-3 fix above),
-- but add a check constraint that tech can't self-promote:
-- (handle in Edge Function crew-remove; add policy WITH CHECK if direct writes stay)

-- For subscriptions: add a check constraint that prevents invalid status transitions
-- via a trigger (cannot express state machine logic in pure RLS):
CREATE OR REPLACE FUNCTION validate_subscription_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot modify a cancelled subscription';
  END IF;
  IF NEW.status = 'active' AND OLD.status NOT IN ('paused') THEN
    RAISE EXCEPTION 'Can only resume from paused state';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_subscription_state_machine
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION validate_subscription_transition();
```

---

### F-5 — Schema drift: live tables diverge from spec (MEDIUM)

The live database (inferred from client code) has a different shape than the BACKEND_GUIDE spec. This is a maintenance and audit hazard:

| Discrepancy | Spec | Live (inferred from API) |
|---|---|---|
| `providers` PK identity column | `id` (gen_random_uuid) linked via `user_id` FK | API uses `owner_user_id` column directly (see `providers.ts:95`) |
| `homeowners` | has `user_id` FK to profiles | API queries `homeowners` with `.eq('id', userId)` — suggests `id = auth.users.id` |
| `provider_blocked_times` | `blocked_date date`, `start_time time`, `end_time time` | API sends `start_at timestamptz`, `end_at timestamptz` — column names differ |
| `provider_service_areas` | column `zip_code` | API inserts `zip` (short name) |
| `provider_team` | Not in spec at all | Live table used by `crew.ts` (replaces `crew_members` from spec) |
| `jobs` | Not in spec at all | Central operational table with `homeowner_id`, `provider_id`, `assigned_tech_id`, `booking_id`, `status`, `timestamps` jsonb |
| `addresses` | Not in spec | Separate table with `homeowner_id`, `street/city/state/zip/neighborhood/lat/lng` |
| `postings` | Not in spec | `homeowner_id`, `service_type`, `headline`, `description`, `photo_urls`, `status`, `match_count`, `matched_provider_id` |
| `messages` | Not in spec | `job_id`, `from_user_id`, `from_role`, `body`, `sent_at`, `read_at`, `client_id` |
| `home_service_status` | Not in spec | `homeowner_id`, `service_type`, `state`, `snoozed_until`, `dismiss_count`, etc. |
| `demand_events` | `homeowner_id` FK to `homeowners(id)` | API inserts `homeowner_id = auth.uid()` directly (FK mismatch risk) |
| `completion_ledger` | `operator_id` FK to providers | `fetchHomeownerCompletions` filters by `homeowner_id` — column may not exist in spec version |

**Safe remediation:** Run `select column_name, data_type from information_schema.columns where table_name = '<table>'` for each divergent table in the live Supabase project to produce a ground-truth schema map. Then reconcile the BACKEND_GUIDE spec with reality. This is a documentation task, but it gates the ability to write accurate RLS policies.

---

### F-6 — `messages.markRead()` UPDATE policy conflict (MEDIUM)

`markRead()` does:
```ts
.update({ read_at: ... })
.eq('job_id', jobId)
.is('read_at', null)
.neq('from_user_id', session.user.id)   // marks OTHER people's messages as read
```

This means the UPDATE policy must allow the current user to update rows they did NOT insert. Any RLS policy that restricts UPDATE to `from_user_id = auth.uid()` will silently no-op — the homeowner will see stale unread counts forever.

**Safe remediation:**

```sql
-- Replace a simple UPDATE policy with one scoped to job participation:
CREATE POLICY "messages_mark_read"
  ON messages FOR UPDATE
  USING (
    read_at IS NULL AND
    from_user_id <> (SELECT auth.uid()) AND
    job_id IN (
      SELECT id FROM jobs
      WHERE homeowner_id = (SELECT id FROM homeowners WHERE user_id = (SELECT auth.uid()))
         OR provider_id  = (SELECT id FROM providers WHERE owner_user_id = (SELECT auth.uid()))
         OR assigned_tech_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (read_at IS NOT NULL);  -- can only set read_at, not modify body
```

---

### F-7 — Missing constraints on financial tables (MEDIUM)

| Table | Missing constraint | Risk |
|---|---|---|
| `completion_ledger` | No `CHECK (amount_cents >= 0)` | Negative ledger entries accepted |
| `jobs` | No `CHECK (amount_cents > 0)` | Zero-amount jobs can be created |
| `subscriptions` | No `CHECK (monthly_estimate_cents > 0)` | Zero-value subscriptions |
| `claims` | `requested_amount_cents` has no bounds check | Arbitrarily large claim amounts accepted by client |
| `bookings` (spec) | `platform_take_rate` has no `CHECK (platform_take_rate BETWEEN 0 AND 1)` | Rate > 1 would produce negative provider payout in generated column |

**Safe remediation:**

```sql
ALTER TABLE completion_ledger ADD CONSTRAINT chk_ledger_amount CHECK (amount_cents >= 0);
ALTER TABLE jobs ADD CONSTRAINT chk_jobs_amount CHECK (amount_cents > 0);
ALTER TABLE subscriptions ADD CONSTRAINT chk_sub_estimate CHECK (monthly_estimate_cents > 0);
ALTER TABLE claims ADD CONSTRAINT chk_claim_amount CHECK (
  requested_amount_cents IS NULL OR (requested_amount_cents > 0 AND requested_amount_cents <= 1000000)
);
-- bookings spec already has generated columns; add:
ALTER TABLE bookings ADD CONSTRAINT chk_take_rate CHECK (platform_take_rate BETWEEN 0 AND 1);
```

---

### F-8 — `demand_events` homeowner_id FK type mismatch (LOW-MEDIUM)

The spec defines `demand_events.homeowner_id` as `uuid REFERENCES homeowners(id)` (references the `homeowners` surrogate PK). The client inserts `data.session?.user.id` (which is `auth.users.id`). If `homeowners.id` is a separate surrogate UUID (not the same as `auth.users.id`), the FK will fail on insert, silently swallowed by the `try/catch` in `track()`.

This means demand events for authenticated users are being stored with `homeowner_id = null` or failing silently, destroying the data flywheel for Phase 4 AI.

**Safe remediation (after confirming live schema):**

Option A — If `homeowners.id = auth.users.id` (most likely based on the `addresses.ts` pattern):
- Update the spec to clarify this; no code change needed.

Option B — If `homeowners.id` is a separate surrogate:
```sql
-- Change FK to auth.users or store NULL for unauthenticated:
ALTER TABLE demand_events DROP CONSTRAINT demand_events_homeowner_id_fkey;
ALTER TABLE demand_events
  ADD CONSTRAINT demand_events_homeowner_id_fkey
  FOREIGN KEY (homeowner_id) REFERENCES auth.users(id) ON DELETE SET NULL;
```

---

### F-9 — `get_eligible_providers` is a public RPC (LOW)

`get_eligible_providers` is defined as `LANGUAGE sql STABLE` with no `SECURITY` clause, making it `SECURITY INVOKER` (correct). However, it is exposed via the Supabase auto-generated RPC layer. Any anon user can call it with arbitrary parameters to enumerate all active providers in any zip code.

This is intentional for MVP (providers are discoverable), but:
1. The function is a full scan candidate — no rate limit at DB layer
2. If it ever moves to SECURITY DEFINER, it must be relocated to a `private` schema

**Safe remediation:**

```sql
-- Move to a private schema to prevent direct RPC invocation; call only from edge functions:
CREATE SCHEMA IF NOT EXISTS private;
ALTER FUNCTION get_eligible_providers(...) SET search_path = private, public;
-- Then: call via supabase.functions (edge function) not supabase.rpc()
```

---

## Remediation Priority Order

| Priority | Finding | Impact | Effort |
|---|---|---|---|
| 1 | F-3: Enable RLS + add policies for `jobs`, `messages`, `addresses` | Data breach if unchecked | Medium (SQL only) |
| 2 | F-2: Consolidate providers SELECT policies / strip sensitive columns | Stripe account ID leak | Low |
| 3 | F-6: messages markRead UPDATE policy | Silent UX breakage | Low |
| 4 | F-5: Schema drift audit | Blocks accurate policy authoring | Low (query work) |
| 5 | F-1: `auth_rls_initplan` fix | Performance | Low |
| 6 | F-4: State machine trigger for subscriptions | Business logic enforcement | Medium |
| 7 | F-7: Financial CHECK constraints | Data integrity | Low |
| 8 | F-8: demand_events FK mismatch | Data flywheel silent failure | Low (confirm then fix) |
| 9 | F-9: RPC enumeration | Operational risk | Low |

---

## Tables With Confirmed RLS Coverage (Spec)

| Table | RLS Enabled | Policies Present |
|---|---|---|
| profiles | Yes | SELECT/UPDATE own, admin ALL |
| providers | Yes | SELECT own + public active (conflicting — see F-2), UPDATE own, admin ALL |
| provider_service_areas | Yes | manage_own, public_read |
| provider_availability | Yes | manage_own |
| homeowners | Yes | SELECT/UPDATE own, admin ALL |
| bookings | Yes | homeowner SELECT/INSERT, provider SELECT, admin ALL |
| subscriptions | Yes | homeowner manage, provider SELECT |
| check_ins | Yes | homeowner INSERT/SELECT, provider SELECT |
| trust_scores | Yes | public SELECT |
| trust_score_history | Yes | public SELECT |
| claims | Yes | homeowner SELECT/INSERT, provider SELECT, admin ALL |
| notifications | Yes | user SELECT/UPDATE own |
| calendar_syncs | Yes | provider own |
| verification_documents | Yes | provider SELECT/INSERT, admin ALL |
| completion_ledger | Spec says "no client access" | **None** — but client queries it directly (F-3) |
| demand_events | Spec says "no client access" | **None** — but client inserts directly (F-3) |
| **jobs** | **NOT IN SPEC** | **None** (F-3) |
| **postings** | **NOT IN SPEC** | **None** (F-3) |
| **messages** | **NOT IN SPEC** | **None** (F-3) |
| **home_service_status** | **NOT IN SPEC** | **None** (F-3) |
| **addresses** | **NOT IN SPEC** | **None** (F-3) |
| **provider_team** | **NOT IN SPEC** | **None** (F-3) |
| **provider_blocked_times** | **NOT IN SPEC** | **None** (F-3) |
