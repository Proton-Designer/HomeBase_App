# HomeBase Marketplace — Full Backend Implementation Guide

> Claude Code reference document. Every section is implementation-complete. Follow this without clarifying questions.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Complete Database Schema](#2-complete-database-schema)
3. [Row Level Security (RLS)](#3-row-level-security-rls)
4. [Routing Engine](#4-routing-engine)
5. [Stripe Integration](#5-stripe-integration)
6. [Check-in System + AI Integration](#6-check-in-system--ai-integration)
7. [Trust Score Computation + AI "Why This Score"](#7-trust-score-computation--ai-why-this-score)
8. [Google Calendar Two-Way Sync](#8-google-calendar-two-way-sync)
9. [Push Notifications (10 types)](#9-push-notifications-10-types)
10. [Verification System](#10-verification-system)
11. [Damage Claims](#11-damage-claims)
12. [Subscription Lifecycle Management](#12-subscription-lifecycle-management)
13. [Supabase Edge Functions Summary](#13-supabase-edge-functions-summary)
14. [API Endpoint Reference](#14-api-endpoint-reference)
15. [Security Checklist](#15-security-checklist)

---

## 1. Tech Stack

| Layer | Service | Purpose |
|---|---|---|
| Database / Auth / Storage / Realtime | Supabase (Postgres 15+) | Single source of truth; Auth handles JWTs; Storage for photos/docs; Realtime for live booking status |
| Edge Functions | Supabase Edge Functions (Deno) | All server-side business logic |
| Payments | Stripe Connect Express | Card-on-file, escrow, instant payouts, damage refunds |
| AI | Anthropic Claude API — `claude-haiku-4-5-20251001` | Photo fraud/quality grading + trust score "why" generation |
| Calendar | Google Calendar API v3 (direct OAuth2) | Two-way booking sync for providers |
| Geocoding / Routing | Google Maps Platform — Geocoding API + Distance Matrix API | Service area matching, provider distance scoring |
| SMS | Telnyx Programmable Messaging API | Booking alerts, OTP, claim notifications |
| Mobile Push | Expo Push Notification Service | All 10 in-app notification types |
| Transactional Email | Resend | Onboarding, receipts, verification, ops alerts |

**Environment variables required (stored in Supabase Vault + `.env.local` for local dev):**

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_CONNECT_CLIENT_ID
ANTHROPIC_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_MAPS_API_KEY
TELNYX_API_KEY
TELNYX_FROM_NUMBER
TELNYX_MESSAGING_PROFILE_ID
EXPO_ACCESS_TOKEN
RESEND_API_KEY
CALENDAR_TOKEN_ENCRYPTION_KEY   # 32-byte hex for AES-256-GCM
```

---

## 2. Complete Database Schema

Run the following in order. All migrations go in `supabase/migrations/`.

### 2.1 Enums

```sql
-- File: 001_enums.sql

CREATE TYPE user_role AS ENUM ('homeowner', 'provider', 'tech', 'admin');
CREATE TYPE provider_status AS ENUM ('pending', 'active', 'suspended', 'deactivated');
CREATE TYPE background_check_status AS ENUM ('pending', 'passed', 'failed', 'expired');
CREATE TYPE booking_type AS ENUM ('subscription', 'one_off');
CREATE TYPE booking_status AS ENUM (
  'pending_match', 'matched', 'confirmed', 'en_route',
  'in_progress', 'completed', 'cancelled', 'disputed'
);
CREATE TYPE service_category AS ENUM ('lawn', 'cleaning', 'pest_control');
CREATE TYPE subscription_frequency AS ENUM ('weekly', 'biweekly', 'monthly');
CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled');
CREATE TYPE check_in_quality AS ENUM ('needs_improvement', 'satisfactory', 'above_and_beyond');
CREATE TYPE claim_status AS ENUM (
  'open', 'under_review',
  'resolved_homeowner_favor', 'resolved_provider_favor',
  'resolved_split', 'closed'
);
CREATE TYPE calendar_provider AS ENUM ('google', 'outlook', 'apple');
CREATE TYPE calendar_sync_status AS ENUM ('active', 'error', 'expired');
CREATE TYPE doc_type AS ENUM ('background_check', 'insurance_cert');
CREATE TYPE doc_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE crew_role AS ENUM ('owner', 'tech');
CREATE TYPE crew_status AS ENUM ('active', 'inactive');
CREATE TYPE demand_event_type AS ENUM ('browse', 'search', 'booking_start', 'booking_complete');
```

### 2.2 Core Tables

```sql
-- File: 002_profiles.sql

CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'homeowner',
  full_name   text NOT NULL,
  phone       varchar(20),
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON profiles(role);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

```sql
-- File: 003_providers.sql

CREATE TABLE providers (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name               text NOT NULL,
  business_description        text,
  service_categories          service_category[] NOT NULL DEFAULT '{}',
  status                      provider_status NOT NULL DEFAULT 'pending',
  verification_tier           int NOT NULL DEFAULT 0 CHECK (verification_tier BETWEEN 0 AND 4),
  is_insured                  bool NOT NULL DEFAULT false,
  background_check_status     background_check_status NOT NULL DEFAULT 'pending',
  insurance_expires_at        date,
  stripe_account_id           text,
  stripe_onboarding_complete  bool NOT NULL DEFAULT false,
  total_jobs_completed        int NOT NULL DEFAULT 0,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_providers_user UNIQUE (user_id)
);

CREATE INDEX idx_providers_user_id ON providers(user_id);
CREATE INDEX idx_providers_status ON providers(status);
CREATE INDEX idx_providers_verification_tier ON providers(verification_tier);

CREATE TRIGGER trg_providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

```sql
-- File: 004_provider_service_areas.sql

CREATE TABLE provider_service_areas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  zip_code     varchar(10) NOT NULL,
  radius_miles float NOT NULL DEFAULT 10.0,
  is_active    bool NOT NULL DEFAULT true
);

CREATE INDEX idx_psa_provider_id ON provider_service_areas(provider_id);
CREATE INDEX idx_psa_zip_code ON provider_service_areas(zip_code) WHERE is_active = true;
```

```sql
-- File: 005_provider_availability.sql

CREATE TABLE provider_availability (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  day_of_week  int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sunday
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  is_recurring bool NOT NULL DEFAULT true,
  CONSTRAINT chk_availability_times CHECK (end_time > start_time)
);

CREATE INDEX idx_pavail_provider_id ON provider_availability(provider_id);
CREATE INDEX idx_pavail_day ON provider_availability(day_of_week);
```

```sql
-- File: 006_provider_blocked_times.sql

CREATE TABLE provider_blocked_times (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  start_time   time,
  end_time     time,
  all_day      bool NOT NULL DEFAULT false,
  reason       text
);

CREATE INDEX idx_pbt_provider_date ON provider_blocked_times(provider_id, blocked_date);
```

```sql
-- File: 007_homeowners.sql

CREATE TABLE homeowners (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  address_line1         text NOT NULL,
  city                  text NOT NULL,
  state                 varchar(2) NOT NULL,
  zip_code              varchar(10) NOT NULL,
  lat                   decimal(10, 7),
  lng                   decimal(10, 7),
  stripe_customer_id    text,
  premium_tier_active   bool NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_homeowners_user UNIQUE (user_id)
);

CREATE INDEX idx_homeowners_user_id ON homeowners(user_id);
CREATE INDEX idx_homeowners_zip ON homeowners(zip_code);

CREATE TRIGGER trg_homeowners_updated_at
  BEFORE UPDATE ON homeowners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

```sql
-- File: 008_subscriptions.sql
-- Defined before bookings because bookings FK references subscriptions

CREATE TABLE subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id        uuid NOT NULL REFERENCES homeowners(id) ON DELETE CASCADE,
  provider_id         uuid REFERENCES providers(id) ON DELETE SET NULL,  -- preferred provider
  service_category    service_category NOT NULL,
  frequency           subscription_frequency NOT NULL,
  day_of_week         int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  scheduled_time      time NOT NULL,
  address_line1       text NOT NULL,
  city                text NOT NULL,
  state               varchar(2) NOT NULL,
  zip_code            varchar(10) NOT NULL,
  status              subscription_status NOT NULL DEFAULT 'active',
  next_booking_date   date,
  started_at          timestamptz NOT NULL DEFAULT now(),
  paused_at           timestamptz,
  cancelled_at        timestamptz
);

CREATE INDEX idx_subs_homeowner_id ON subscriptions(homeowner_id);
CREATE INDEX idx_subs_status ON subscriptions(status);
CREATE INDEX idx_subs_next_booking_date ON subscriptions(next_booking_date) WHERE status = 'active';
```

```sql
-- File: 009_bookings.sql

CREATE TABLE bookings (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id            uuid NOT NULL REFERENCES homeowners(id) ON DELETE RESTRICT,
  provider_id             uuid REFERENCES providers(id) ON DELETE SET NULL,
  service_category        service_category NOT NULL,
  booking_type            booking_type NOT NULL,
  status                  booking_status NOT NULL DEFAULT 'pending_match',
  scheduled_date          date NOT NULL,
  scheduled_time          time NOT NULL,
  duration_minutes        int NOT NULL DEFAULT 60,
  address_line1           text NOT NULL,
  city                    text NOT NULL,
  state                   varchar(2) NOT NULL,
  zip_code                varchar(10) NOT NULL,
  lat                     decimal(10, 7),
  lng                     decimal(10, 7),
  special_instructions    text,
  estimated_price         decimal(10, 2) NOT NULL,
  final_price             decimal(10, 2),
  platform_take_rate      decimal(5, 4) NOT NULL,          -- 0.1000 or 0.1750
  platform_fee            decimal(10, 2) GENERATED ALWAYS AS
                            (ROUND(COALESCE(final_price, estimated_price) * platform_take_rate, 2)) STORED,
  provider_payout         decimal(10, 2) GENERATED ALWAYS AS
                            (COALESCE(final_price, estimated_price) -
                             ROUND(COALESCE(final_price, estimated_price) * platform_take_rate, 2)) STORED,
  stripe_payment_intent_id text,
  stripe_transfer_id      text,
  escrow_held             bool NOT NULL DEFAULT false,
  escrow_release_at       timestamptz,
  routing_attempts        int NOT NULL DEFAULT 0,
  routed_provider_ids     uuid[] NOT NULL DEFAULT '{}',  -- tracks who was tried, to exclude on retry
  subscription_id         uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  google_calendar_event_id text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_homeowner_id ON bookings(homeowner_id);
CREATE INDEX idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_scheduled_date ON bookings(scheduled_date);
CREATE INDEX idx_bookings_subscription_id ON bookings(subscription_id);
CREATE INDEX idx_bookings_stripe_pi ON bookings(stripe_payment_intent_id);

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

```sql
-- File: 010_check_ins.sql

CREATE TABLE check_ins (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  submitted_by_user_id      uuid NOT NULL REFERENCES profiles(id),
  did_provider_show_up      bool NOT NULL,
  arrival_delta_minutes     int,  -- negative = early, positive = late, null = not tracked
  quality_rating            check_in_quality NOT NULL,
  free_text                 text,
  photo_urls                text[] NOT NULL DEFAULT '{}',
  homeowner_consent_given   bool NOT NULL DEFAULT false,
  ai_photo_grade            jsonb,
  -- Expected shape: { fraud_detected: bool, fraud_confidence: float, work_quality: string, reasoning: string }
  ai_summary_generated      bool NOT NULL DEFAULT false,
  submitted_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_checkin_booking UNIQUE (booking_id)  -- one per booking
);

CREATE INDEX idx_checkins_booking_id ON check_ins(booking_id);
CREATE INDEX idx_checkins_submitted_by ON check_ins(submitted_by_user_id);
```

```sql
-- File: 011_trust_scores.sql

CREATE TABLE trust_scores (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id             uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  reliability_score       decimal(5, 2) NOT NULL DEFAULT 0 CHECK (reliability_score BETWEEN 0 AND 100),
  quality_score           decimal(5, 2) NOT NULL DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  communication_score     decimal(5, 2) NOT NULL DEFAULT 0 CHECK (communication_score BETWEEN 0 AND 100),
  professionalism_score   decimal(5, 2) NOT NULL DEFAULT 0 CHECK (professionalism_score BETWEEN 0 AND 100),
  composite_score         decimal(5, 2) GENERATED ALWAYS AS (
                            ROUND(
                              reliability_score * 0.35 +
                              quality_score * 0.35 +
                              communication_score * 0.15 +
                              professionalism_score * 0.15,
                            2)) STORED,
  why_reliability         text,
  why_quality             text,
  why_communication       text,
  why_professionalism     text,
  check_ins_used          int NOT NULL DEFAULT 0,
  last_computed_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_trust_provider UNIQUE (provider_id)
);

CREATE INDEX idx_trust_provider_id ON trust_scores(provider_id);
CREATE INDEX idx_trust_composite ON trust_scores(composite_score DESC);

CREATE TABLE trust_score_history (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id           uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  composite_score       decimal(5, 2) NOT NULL,
  reliability_score     decimal(5, 2) NOT NULL,
  quality_score         decimal(5, 2) NOT NULL,
  communication_score   decimal(5, 2) NOT NULL,
  professionalism_score decimal(5, 2) NOT NULL,
  snapshot_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tsh_provider_id ON trust_score_history(provider_id);
CREATE INDEX idx_tsh_snapshot_at ON trust_score_history(provider_id, snapshot_at DESC);
```

```sql
-- File: 012_crew_members.sql

CREATE TABLE crew_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         crew_role NOT NULL DEFAULT 'tech',
  status       crew_status NOT NULL DEFAULT 'active',
  added_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_crew_member UNIQUE (provider_id, user_id)
);

CREATE INDEX idx_crew_provider_id ON crew_members(provider_id);
CREATE INDEX idx_crew_user_id ON crew_members(user_id);
```

```sql
-- File: 013_claims.sql

CREATE TABLE claims (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                uuid NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  homeowner_id              uuid NOT NULL REFERENCES homeowners(id),
  provider_id               uuid NOT NULL REFERENCES providers(id),
  incident_description      text NOT NULL,
  photo_urls                text[] NOT NULL DEFAULT '{}',
  estimated_damage_cost     decimal(10, 2),
  status                    claim_status NOT NULL DEFAULT 'open',
  homebase_coverage_applied bool NOT NULL DEFAULT false,
  resolution_notes          text,
  opened_at                 timestamptz NOT NULL DEFAULT now(),
  resolved_at               timestamptz
);

CREATE INDEX idx_claims_booking_id ON claims(booking_id);
CREATE INDEX idx_claims_homeowner_id ON claims(homeowner_id);
CREATE INDEX idx_claims_provider_id ON claims(provider_id);
CREATE INDEX idx_claims_status ON claims(status);
```

```sql
-- File: 014_calendar_syncs.sql

CREATE TABLE calendar_syncs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id             uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  calendar_provider       calendar_provider NOT NULL DEFAULT 'google',
  access_token_encrypted  text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  token_expires_at        timestamptz,
  calendar_id             varchar(255) NOT NULL,
  last_synced_at          timestamptz,
  sync_status             calendar_sync_status NOT NULL DEFAULT 'active',
  CONSTRAINT uq_calendar_provider UNIQUE (provider_id, calendar_provider)
);

CREATE INDEX idx_cal_provider_id ON calendar_syncs(provider_id);
```

```sql
-- File: 015_verification_documents.sql

CREATE TABLE verification_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  doc_type     doc_type NOT NULL,
  status       doc_status NOT NULL DEFAULT 'pending',
  file_url     text NOT NULL,  -- Supabase Storage path (private bucket)
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_verdocs_provider_id ON verification_documents(provider_id);
CREATE INDEX idx_verdocs_status ON verification_documents(status);
```

```sql
-- File: 016_notifications.sql

CREATE TABLE notifications (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type     varchar(50) NOT NULL,
  title    text NOT NULL,
  body     text NOT NULL,
  data     jsonb NOT NULL DEFAULT '{}',
  read_at  timestamptz,
  sent_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_user_id ON notifications(user_id);
CREATE INDEX idx_notif_read ON notifications(user_id, read_at) WHERE read_at IS NULL;
```

```sql
-- File: 017_data_hooks.sql

-- Day-1 demand and completion intelligence

CREATE TABLE completion_ledger (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  operator_id      uuid NOT NULL REFERENCES providers(id),
  service_category service_category NOT NULL,
  zip_code         varchar(10) NOT NULL,
  final_price      decimal(10, 2) NOT NULL,
  check_in_quality varchar(30) NOT NULL,
  completed_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_ledger_booking UNIQUE (booking_id)
);

CREATE INDEX idx_ledger_zip_cat_date ON completion_ledger(zip_code, service_category, completed_at DESC);

CREATE TABLE demand_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id     uuid REFERENCES homeowners(id) ON DELETE SET NULL,
  event_type       demand_event_type NOT NULL,
  service_category service_category,
  zip_code         varchar(10),
  day_of_week      int CHECK (day_of_week BETWEEN 0 AND 6),
  hour_of_day      int CHECK (hour_of_day BETWEEN 0 AND 23),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_demand_zip_cat ON demand_events(zip_code, service_category);
CREATE INDEX idx_demand_created_at ON demand_events(created_at DESC);
```

---

## 3. Row Level Security (RLS)

Enable RLS on every table, then define policies. The service role bypasses RLS by default — all Edge Functions use the service role client.

```sql
-- File: 018_rls.sql

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeowners ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_syncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE completion_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "profiles_read_own"
ON profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "profiles_admin_all"
ON profiles FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================
-- PROVIDERS
-- ============================================================
CREATE POLICY "providers_read_own"
ON providers FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "providers_update_own"
ON providers FOR UPDATE
USING (user_id = auth.uid());

-- Public read for marketplace discovery (trust scores, categories visible)
CREATE POLICY "providers_public_read_active"
ON providers FOR SELECT
USING (status = 'active');

CREATE POLICY "providers_admin_all"
ON providers FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================
-- PROVIDER SERVICE AREAS / AVAILABILITY / BLOCKED TIMES
-- ============================================================
CREATE POLICY "psa_manage_own"
ON provider_service_areas FOR ALL
USING (provider_id = (SELECT id FROM providers WHERE user_id = auth.uid()));

CREATE POLICY "psa_public_read"
ON provider_service_areas FOR SELECT
USING (is_active = true);

CREATE POLICY "pavail_manage_own"
ON provider_availability FOR ALL
USING (provider_id = (SELECT id FROM providers WHERE user_id = auth.uid()));

CREATE POLICY "pbt_manage_own"
ON provider_blocked_times FOR ALL
USING (provider_id = (SELECT id FROM providers WHERE user_id = auth.uid()));

-- ============================================================
-- HOMEOWNERS
-- ============================================================
CREATE POLICY "homeowners_read_own"
ON homeowners FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "homeowners_update_own"
ON homeowners FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "homeowners_admin_all"
ON homeowners FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE POLICY "homeowner_read_own_bookings"
ON bookings FOR SELECT
USING (homeowner_id = (SELECT id FROM homeowners WHERE user_id = auth.uid()));

CREATE POLICY "provider_read_assigned_bookings"
ON bookings FOR SELECT
USING (provider_id = (SELECT id FROM providers WHERE user_id = auth.uid()));

CREATE POLICY "homeowner_insert_booking"
ON bookings FOR INSERT
WITH CHECK (homeowner_id = (SELECT id FROM homeowners WHERE user_id = auth.uid()));

-- Providers can only update status-related fields (handled via Edge Function with service role)
-- Direct provider UPDATE is intentionally blocked; all status changes go through Edge Functions.

CREATE POLICY "bookings_admin_all"
ON bookings FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE POLICY "homeowner_manage_own_subscriptions"
ON subscriptions FOR ALL
USING (homeowner_id = (SELECT id FROM homeowners WHERE user_id = auth.uid()));

CREATE POLICY "provider_read_assigned_subscriptions"
ON subscriptions FOR SELECT
USING (provider_id = (SELECT id FROM providers WHERE user_id = auth.uid()));

-- ============================================================
-- CHECK-INS
-- ============================================================
CREATE POLICY "homeowner_insert_checkin"
ON check_ins FOR INSERT
WITH CHECK (
  submitted_by_user_id = auth.uid() AND
  booking_id IN (
    SELECT b.id FROM bookings b
    JOIN homeowners h ON h.id = b.homeowner_id
    WHERE h.user_id = auth.uid()
  )
);

CREATE POLICY "homeowner_read_own_checkins"
ON check_ins FOR SELECT
USING (
  booking_id IN (
    SELECT b.id FROM bookings b
    JOIN homeowners h ON h.id = b.homeowner_id
    WHERE h.user_id = auth.uid()
  )
);

CREATE POLICY "provider_read_own_checkins"
ON check_ins FOR SELECT
USING (
  booking_id IN (
    SELECT b.id FROM bookings b
    JOIN providers p ON p.id = b.provider_id
    WHERE p.user_id = auth.uid()
  )
);

-- ============================================================
-- TRUST SCORES — publicly readable (core marketplace signal)
-- ============================================================
CREATE POLICY "trust_scores_public_read"
ON trust_scores FOR SELECT
USING (true);

CREATE POLICY "trust_score_history_public_read"
ON trust_score_history FOR SELECT
USING (true);

-- ============================================================
-- CLAIMS
-- ============================================================
CREATE POLICY "claims_homeowner_read_own"
ON claims FOR SELECT
USING (homeowner_id = (SELECT id FROM homeowners WHERE user_id = auth.uid()));

CREATE POLICY "claims_homeowner_insert"
ON claims FOR INSERT
WITH CHECK (homeowner_id = (SELECT id FROM homeowners WHERE user_id = auth.uid()));

CREATE POLICY "claims_provider_read_own"
ON claims FOR SELECT
USING (provider_id = (SELECT id FROM providers WHERE user_id = auth.uid()));

CREATE POLICY "claims_admin_all"
ON claims FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================
-- NOTIFICATIONS — own only
-- ============================================================
CREATE POLICY "notifications_read_own"
ON notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
ON notifications FOR UPDATE
USING (user_id = auth.uid());

-- ============================================================
-- CALENDAR SYNCS
-- ============================================================
CREATE POLICY "calendar_syncs_own"
ON calendar_syncs FOR ALL
USING (provider_id = (SELECT id FROM providers WHERE user_id = auth.uid()));

-- ============================================================
-- VERIFICATION DOCUMENTS
-- ============================================================
CREATE POLICY "verdocs_provider_own"
ON verification_documents FOR SELECT
USING (provider_id = (SELECT id FROM providers WHERE user_id = auth.uid()));

CREATE POLICY "verdocs_provider_insert"
ON verification_documents FOR INSERT
WITH CHECK (provider_id = (SELECT id FROM providers WHERE user_id = auth.uid()));

CREATE POLICY "verdocs_admin_all"
ON verification_documents FOR ALL
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================
-- COMPLETION LEDGER + DEMAND EVENTS — service role only
-- No direct client access. Edge Functions use service role.
-- ============================================================
-- (No client-facing policies; tables remain locked to anon/authenticated)
```

---

## 4. Routing Engine

**File:** `supabase/functions/route-booking/index.ts`

This function is called by: `POST /api/bookings` (initial route), `POST /api/bookings/:id/decline` (re-route), and pg_cron (15-min timeout re-route).

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface RouteBookingPayload {
  booking_id: string;
  service_category: string;
  zip_code: string;
  scheduled_date: string;   // ISO date string
  scheduled_time: string;   // HH:MM
  duration_minutes: number;
  homeowner_id: string;
  subscription_id?: string;
  is_subscription: boolean;
}

serve(async (req) => {
  const payload: RouteBookingPayload = await req.json();
  const {
    booking_id, service_category, zip_code, scheduled_date,
    scheduled_time, duration_minutes, homeowner_id,
    subscription_id, is_subscription
  } = payload;

  // --- Fetch current booking to get routing state ---
  const { data: booking } = await supabase
    .from("bookings")
    .select("routing_attempts, routed_provider_ids, status")
    .eq("id", booking_id)
    .single();

  if (!booking || booking.status === "confirmed" || booking.status === "cancelled") {
    return new Response(JSON.stringify({ error: "Booking not routable" }), { status: 400 });
  }

  const MAX_ATTEMPTS = 3;
  if (booking.routing_attempts >= MAX_ATTEMPTS) {
    // Exhaust — cancel booking
    await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking_id);

    await sendPushToHomeowner(homeowner_id, {
      type: "booking_cancelled",
      title: "We couldn't find a provider",
      body: "Sorry — no providers were available for your requested time. Try a different time slot.",
      data: { booking_id }
    });

    return new Response(JSON.stringify({ routed: false, reason: "max_attempts_reached" }), { status: 200 });
  }

  const scheduledDow = new Date(scheduled_date).getDay();

  // --- Step 1: Find eligible providers ---
  const minTier = is_subscription ? 2 : 1;

  // Get providers who:
  //   - offer the service category
  //   - have an active service area covering the zip
  //   - meet verification tier
  //   - have NOT been tried yet
  //   - are status = 'active'
  const { data: candidates } = await supabase.rpc("get_eligible_providers", {
    p_service_category: service_category,
    p_zip_code: zip_code,
    p_scheduled_date: scheduled_date,
    p_scheduled_time: scheduled_time,
    p_duration_minutes: duration_minutes,
    p_min_tier: minTier,
    p_exclude_provider_ids: booking.routed_provider_ids ?? []
  });

  // get_eligible_providers is a Postgres function (see below) that returns:
  // { provider_id, composite_score, distance_miles, verification_tier, lat, lng }

  if (!candidates || candidates.length === 0) {
    // No candidates at all — increment and fail
    await supabase
      .from("bookings")
      .update({ routing_attempts: booking.routing_attempts + 1 })
      .eq("id", booking_id);
    return new Response(JSON.stringify({ routed: false, reason: "no_candidates" }), { status: 200 });
  }

  // --- Step 2: Loyalty bonus for subscriptions ---
  let loyaltyProviderIds: string[] = [];
  if (is_subscription && subscription_id) {
    const { data: prevBookings } = await supabase
      .from("bookings")
      .select("provider_id")
      .eq("subscription_id", subscription_id)
      .eq("homeowner_id", homeowner_id)
      .eq("status", "completed")
      .not("provider_id", "is", null)
      .limit(10);
    loyaltyProviderIds = [...new Set(prevBookings?.map((b: any) => b.provider_id) ?? [])];
  }

  // --- Step 3: Score candidates ---
  const maxDistance = Math.max(...candidates.map((c: any) => c.distance_miles), 1);

  const scored = candidates.map((c: any) => {
    const trustFactor = ((c.composite_score ?? 50) / 100) * 0.5;
    const distanceFactor = (1 - (c.distance_miles / maxDistance)) * 0.3;
    const tierFactor = (c.verification_tier / 4) * 0.1;
    const rrBonus = 0.1 / (candidates.length);  // small round-robin equalizer
    const loyaltyBonus = loyaltyProviderIds.includes(c.provider_id) ? 0.25 : 0;

    return {
      provider_id: c.provider_id,
      score: trustFactor + distanceFactor + tierFactor + rrBonus + loyaltyBonus
    };
  });

  scored.sort((a: any, b: any) => b.score - a.score);
  const winner = scored[0];

  // --- Step 4: Assign provider to booking ---
  const newRoutedIds = [...(booking.routed_provider_ids ?? []), winner.provider_id];
  await supabase
    .from("bookings")
    .update({
      provider_id: winner.provider_id,
      status: "matched",
      routing_attempts: booking.routing_attempts + 1,
      routed_provider_ids: newRoutedIds
    })
    .eq("id", booking_id);

  // --- Step 5: Notify provider ---
  const { data: provider } = await supabase
    .from("providers")
    .select("user_id, business_name")
    .eq("id", winner.provider_id)
    .single();

  await sendPushToUser(provider.user_id, {
    type: "booking_matched",
    title: "New job available",
    body: `New ${service_category} job on ${scheduled_date}. Accept within 15 minutes.`,
    data: { booking_id, accept_deadline: new Date(Date.now() + 15 * 60 * 1000).toISOString() }
  });

  // --- Step 6: Schedule 15-minute timeout re-route via pg_cron ---
  // This is handled by a separate pg_cron job that polls for 'matched' bookings
  // older than 15 minutes and calls this function again.
  // See: 019_pg_cron_jobs.sql

  return new Response(JSON.stringify({ routed: true, provider_id: winner.provider_id }), { status: 200 });
});

async function sendPushToUser(userId: string, notification: any) {
  await supabase.functions.invoke("send-push-notification", {
    body: { user_id: userId, ...notification }
  });
}

async function sendPushToHomeowner(homeownerId: string, notification: any) {
  const { data: homeowner } = await supabase
    .from("homeowners")
    .select("user_id")
    .eq("id", homeownerId)
    .single();
  if (homeowner) await sendPushToUser(homeowner.user_id, notification);
}
```

### 4.1 `get_eligible_providers` Postgres Function

```sql
-- File: 019_functions.sql

CREATE OR REPLACE FUNCTION get_eligible_providers(
  p_service_category text,
  p_zip_code varchar,
  p_scheduled_date date,
  p_scheduled_time time,
  p_duration_minutes int,
  p_min_tier int,
  p_exclude_provider_ids uuid[]
)
RETURNS TABLE (
  provider_id       uuid,
  composite_score   decimal,
  distance_miles    float,
  verification_tier int
)
LANGUAGE sql STABLE AS $$
  WITH time_end AS (
    SELECT (p_scheduled_time + (p_duration_minutes || ' minutes')::interval)::time AS end_time
  ),
  dow AS (
    SELECT EXTRACT(DOW FROM p_scheduled_date)::int AS day
  )
  SELECT DISTINCT
    p.id                       AS provider_id,
    COALESCE(ts.composite_score, 50) AS composite_score,
    -- Distance: haversine approximation using lat/lng of homeowner zip
    -- For MVP, use distance_miles = 0 (no lat/lng on provider service areas at row level).
    -- Real implementation: join to a zip_codes reference table.
    0.0::float                 AS distance_miles,
    p.verification_tier
  FROM providers p
  JOIN provider_service_areas psa ON psa.provider_id = p.id
  JOIN provider_availability pa ON pa.provider_id = p.id
  LEFT JOIN trust_scores ts ON ts.provider_id = p.id
  WHERE
    p_service_category = ANY(p.service_categories::text[])
    AND psa.zip_code = p_zip_code
    AND psa.is_active = true
    AND p.status = 'active'
    AND p.verification_tier >= p_min_tier
    AND p.id != ALL(p_exclude_provider_ids)
    -- Available on the right day and time window
    AND pa.day_of_week = (SELECT day FROM dow)
    AND pa.start_time <= p_scheduled_time
    AND pa.end_time >= (SELECT end_time FROM time_end)
    -- No confirmed booking overlapping this slot
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.provider_id = p.id
        AND b.scheduled_date = p_scheduled_date
        AND b.status IN ('confirmed', 'en_route', 'in_progress', 'matched')
        AND b.scheduled_time < (SELECT end_time FROM time_end)
        AND (b.scheduled_time + (b.duration_minutes || ' minutes')::interval)::time > p_scheduled_time
    )
    -- No blocked time covering this slot
    AND NOT EXISTS (
      SELECT 1 FROM provider_blocked_times pbt
      WHERE pbt.provider_id = p.id
        AND pbt.blocked_date = p_scheduled_date
        AND (
          pbt.all_day = true
          OR (pbt.start_time <= p_scheduled_time AND pbt.end_time >= (SELECT end_time FROM time_end))
        )
    );
$$;
```

### 4.2 pg_cron Jobs

```sql
-- File: 019_pg_cron_jobs.sql
-- Requires pg_cron extension: SELECT cron.schedule(...)

-- Re-route matched bookings that timed out (15-minute accept window)
SELECT cron.schedule(
  'reroute-timed-out-bookings',
  '*/5 * * * *',  -- every 5 minutes
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_functions_url') || '/route-booking',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := row_to_json(t)::jsonb
    )
    FROM (
      SELECT
        b.id AS booking_id,
        b.service_category,
        b.zip_code,
        b.scheduled_date::text,
        b.scheduled_time::text,
        b.duration_minutes,
        b.homeowner_id,
        b.subscription_id,
        (b.booking_type = 'subscription') AS is_subscription
      FROM bookings b
      WHERE b.status = 'matched'
        AND b.updated_at < now() - interval '15 minutes'
        AND b.routing_attempts < 3
    ) t;
  $$
);

-- Daily subscription booking generation at 5am UTC
SELECT cron.schedule(
  'generate-subscription-bookings',
  '0 5 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_functions_url') || '/create-subscription-bookings',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Check-in auto-submit (2 hours after completion)
SELECT cron.schedule(
  'auto-submit-checkins',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_functions_url') || '/process-checkin',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('auto_submit_mode', true)
    );
  $$
);

-- Release escrow transfers (48 hours after job completion)
SELECT cron.schedule(
  'release-escrow',
  '*/30 * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_functions_url') || '/release-escrow',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Google Calendar sync (every 15 minutes)
SELECT cron.schedule(
  'sync-google-calendar',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_functions_url') || '/sync-google-calendar',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Insurance expiry check (daily at 6am)
SELECT cron.schedule(
  'check-insurance-expiry',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_functions_url') || '/check-verification-expiry',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

---

## 5. Stripe Integration

**File:** `supabase/functions/handle-stripe-webhook/index.ts` (covers all webhooks)

### 5.1 Provider Connect Onboarding

```typescript
// Called from POST /api/providers/stripe/onboarding-link
import Stripe from "https://esm.sh/stripe@12.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient()
});

export async function createConnectAccount(providerUserId: string, email: string) {
  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true }
    },
    settings: {
      payouts: { schedule: { interval: "manual" } }  // Manual payouts; we trigger instant payouts
    }
  });

  // Store stripe_account_id on providers record
  await supabase
    .from("providers")
    .update({ stripe_account_id: account.id })
    .eq("user_id", providerUserId);

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${Deno.env.get("APP_URL")}/onboarding/stripe/refresh`,
    return_url: `${Deno.env.get("APP_URL")}/onboarding/stripe/complete`,
    type: "account_onboarding"
  });

  return accountLink.url;
}
```

### 5.2 Homeowner Payment Setup

```typescript
// On homeowner signup completion
export async function setupHomeownerPayment(email: string, name: string, homeownerId: string) {
  const customer = await stripe.customers.create({ email, name });

  await supabase
    .from("homeowners")
    .update({ stripe_customer_id: customer.id })
    .eq("id", homeownerId);

  const setupIntent = await stripe.setupIntents.create({
    customer: customer.id,
    payment_method_types: ["card"],
    usage: "off_session"
  });

  // Return client_secret to frontend — frontend calls stripe.confirmCardSetup()
  return { client_secret: setupIntent.client_secret };
}
```

### 5.3 Booking Payment — 4-Stage Flow

```typescript
// Stage 1: Authorize at booking confirmation
export async function authorizeBookingPayment(booking: any, homeowner: any, provider: any) {
  const isNewProvider = provider.total_jobs_completed < 5;
  const amountCents = Math.round(booking.estimated_price * 100);
  const feeCents = Math.round(booking.platform_fee * 100);

  const piParams: any = {
    amount: amountCents,
    currency: "usd",
    customer: homeowner.stripe_customer_id,
    payment_method: homeowner.default_payment_method_id,
    confirm: true,
    capture_method: "manual",  // Auth only, not captured yet
    off_session: true,
    application_fee_amount: feeCents,
    metadata: { booking_id: booking.id, homeowner_id: homeowner.id, provider_id: provider.id }
  };

  // For established providers, include transfer_data to auto-split on capture
  if (!isNewProvider) {
    piParams.transfer_data = { destination: provider.stripe_account_id };
  }

  const paymentIntent = await stripe.paymentIntents.create(piParams);

  const escrowReleaseAt = isNewProvider
    ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    : null;

  await supabase
    .from("bookings")
    .update({
      stripe_payment_intent_id: paymentIntent.id,
      escrow_held: isNewProvider,
      escrow_release_at: escrowReleaseAt
    })
    .eq("id", booking.id);

  return paymentIntent;
}

// Stage 2: Capture at completion (triggered by check-in or 2-hour auto)
export async function captureBookingPayment(bookingId: string) {
  const { data: booking } = await supabase
    .from("bookings")
    .select("stripe_payment_intent_id, final_price, estimated_price, escrow_held, provider_id")
    .eq("id", bookingId)
    .single();

  const amountCents = Math.round((booking.final_price ?? booking.estimated_price) * 100);

  await stripe.paymentIntents.capture(booking.stripe_payment_intent_id, {
    amount_to_capture: amountCents
  });

  // Stage 3: If escrow, do NOT auto-transfer — pg_cron will call release-escrow
  if (!booking.escrow_held) {
    // For established providers, transfer_data on PaymentIntent handles split automatically
    return;
  }

  // For new providers, the PaymentIntent has no transfer_data.
  // pg_cron release-escrow function will create the transfer after 48h.
}

// Stage 4: Instant payout (provider requests)
export async function requestInstantPayout(providerStripeAccountId: string, amountCents: number) {
  const payout = await stripe.payouts.create(
    {
      amount: amountCents,
      currency: "usd",
      method: "instant"
    },
    { stripeAccount: providerStripeAccountId }
  );
  return payout;
}
```

### 5.4 Escrow Release Function

**File:** `supabase/functions/release-escrow/index.ts`

```typescript
serve(async () => {
  const { data: releasable } = await supabase
    .from("bookings")
    .select("id, provider_payout, provider_id, stripe_payment_intent_id, providers(stripe_account_id)")
    .eq("escrow_held", true)
    .lte("escrow_release_at", new Date().toISOString())
    .eq("status", "completed")
    .is("stripe_transfer_id", null);

  for (const booking of releasable ?? []) {
    const payoutCents = Math.round(booking.provider_payout * 100);

    const transfer = await stripe.transfers.create({
      amount: payoutCents,
      currency: "usd",
      destination: booking.providers.stripe_account_id,
      transfer_group: `booking_${booking.id}`,
      source_transaction: await getChargeFromPaymentIntent(booking.stripe_payment_intent_id)
    });

    await supabase
      .from("bookings")
      .update({ escrow_held: false, stripe_transfer_id: transfer.id })
      .eq("id", booking.id);
  }

  return new Response(JSON.stringify({ released: releasable?.length ?? 0 }), { status: 200 });
});

async function getChargeFromPaymentIntent(piId: string): Promise<string> {
  const pi = await stripe.paymentIntents.retrieve(piId);
  return pi.latest_charge as string;
}
```

### 5.5 Webhook Handler

**File:** `supabase/functions/handle-stripe-webhook/index.ts`

```typescript
serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("stripe_payment_intent_id", pi.id)
        .eq("status", "pending_match");  // Only if still at initial stage
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, homeowner_id, provider_id")
        .eq("stripe_payment_intent_id", pi.id)
        .single();

      if (booking) {
        await supabase
          .from("bookings")
          .update({ status: "cancelled" })
          .eq("id", booking.id);

        // Notify homeowner
        await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: await getUserIdFromHomeowner(booking.homeowner_id),
            type: "booking_cancelled",
            title: "Payment failed",
            body: "Your payment could not be processed. Please update your payment method.",
            data: { booking_id: booking.id }
          }
        });
      }
      break;
    }
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      if (account.charges_enabled && account.payouts_enabled) {
        await supabase
          .from("providers")
          .update({ stripe_onboarding_complete: true })
          .eq("stripe_account_id", account.id);
      }
      break;
    }
    case "transfer.created": {
      const transfer = event.data.object as Stripe.Transfer;
      // Notify provider of incoming payout
      await notifyProviderOfPayout(transfer);
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
```

---

## 6. Check-in System + AI Integration

**File:** `supabase/functions/process-checkin/index.ts`

```typescript
import Anthropic from "https://esm.sh/@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

serve(async (req) => {
  const payload = await req.json();

  // AUTO-SUBMIT MODE: pg_cron calls with { auto_submit_mode: true }
  if (payload.auto_submit_mode) {
    return await autoSubmitNeutralCheckIns();
  }

  const { booking_id, did_show_up, quality_rating, free_text, photo_urls, consent_given, user_id } = payload;

  // --- Validate ---
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, homeowner_id, provider_id, homeowners(user_id), providers(id)")
    .eq("id", booking_id)
    .single();

  if (!booking) return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404 });
  if (booking.status !== "completed") return new Response(JSON.stringify({ error: "Booking not completed" }), { status: 400 });
  if (booking.homeowners.user_id !== user_id) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });

  // Check no duplicate
  const { data: existing } = await supabase
    .from("check_ins")
    .select("id")
    .eq("booking_id", booking_id)
    .single();
  if (existing) return new Response(JSON.stringify({ error: "Check-in already submitted" }), { status: 409 });

  // --- Insert initial check-in ---
  const { data: checkIn } = await supabase
    .from("check_ins")
    .insert({
      booking_id,
      submitted_by_user_id: user_id,
      did_provider_show_up: did_show_up,
      quality_rating,
      free_text: free_text ?? null,
      photo_urls: photo_urls ?? [],
      homeowner_consent_given: consent_given ?? false,
      ai_summary_generated: false
    })
    .select()
    .single();

  // --- AI Photo Grading (only if photos provided AND consent given) ---
  let aiPhotoGrade = null;
  if (photo_urls?.length > 0 && consent_given) {
    aiPhotoGrade = await gradePhotos(photo_urls, booking_id);

    if (aiPhotoGrade.fraud_detected && aiPhotoGrade.fraud_confidence > 0.85) {
      // Flag for ops review
      await supabase
        .from("bookings")
        .update({ status: "disputed" })
        .eq("id", booking_id);

      await supabase
        .from("claims")
        .insert({
          booking_id,
          homeowner_id: booking.homeowner_id,
          provider_id: booking.provider_id,
          incident_description: `AI fraud detection triggered. Confidence: ${aiPhotoGrade.fraud_confidence}. Reasoning: ${aiPhotoGrade.reasoning}`,
          photo_urls,
          status: "open"
        });
    }

    await supabase
      .from("check_ins")
      .update({ ai_photo_grade: aiPhotoGrade })
      .eq("id", checkIn.id);
  }

  // --- Compute trust score ---
  await supabase.functions.invoke("compute-trust-score", {
    body: { provider_id: booking.provider_id }
  });

  // --- Update completion ledger ---
  await supabase
    .from("completion_ledger")
    .insert({
      booking_id,
      operator_id: booking.provider_id,
      service_category: booking.service_category,
      zip_code: booking.zip_code,
      final_price: booking.final_price ?? booking.estimated_price,
      check_in_quality: quality_rating,
      completed_at: new Date().toISOString()
    })
    .onConflict("booking_id")
    .ignore();

  // --- Trigger escrow release check ---
  await supabase.functions.invoke("release-escrow", { body: {} });

  return new Response(JSON.stringify({ success: true, check_in_id: checkIn.id }), { status: 200 });
});

async function gradePhotos(photoUrls: string[], bookingId: string): Promise<any> {
  // Fetch signed URLs for private bucket photos
  const signedUrls = await Promise.all(
    photoUrls.map(async (path) => {
      const { data } = await supabase.storage
        .from("checkin-photos")
        .createSignedUrl(path, 3600);
      return data?.signedUrl;
    })
  );

  const imageContent = signedUrls
    .filter(Boolean)
    .map((url) => ({
      type: "image" as const,
      source: { type: "url" as const, url: url! }
    }));

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          ...imageContent,
          {
            type: "text",
            text: `Analyze this home service completion photo. Return JSON only, no markdown, no explanation outside the JSON:
{"fraud_detected": boolean, "fraud_confidence": float_0_to_1, "work_quality": "poor"|"satisfactory"|"good"|"excellent", "reasoning": "one sentence under 25 words"}

Fraud signals to look for: stock photos, Google Maps screenshots, photos clearly not matching the described service category, EXIF timestamps inconsistent with job time, repeated identical images.`
          }
        ]
      }
    ]
  });

  try {
    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    return JSON.parse(text);
  } catch {
    return { fraud_detected: false, fraud_confidence: 0, work_quality: "satisfactory", reasoning: "Could not parse AI response" };
  }
}

async function autoSubmitNeutralCheckIns() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, provider_id, homeowner_id, homeowners(user_id)")
    .eq("status", "completed")
    .lte("updated_at", twoHoursAgo)
    .not("id", "in", `(SELECT booking_id FROM check_ins)`);

  let autoSubmitted = 0;
  for (const booking of bookings ?? []) {
    await supabase.from("check_ins").insert({
      booking_id: booking.id,
      submitted_by_user_id: booking.homeowners.user_id,
      did_provider_show_up: true,
      quality_rating: "satisfactory",
      free_text: null,
      photo_urls: [],
      homeowner_consent_given: false,
      ai_summary_generated: false
    }).onConflict("booking_id").ignore();

    await supabase.functions.invoke("compute-trust-score", {
      body: { provider_id: booking.provider_id }
    });

    autoSubmitted++;
  }

  return new Response(JSON.stringify({ auto_submitted: autoSubmitted }), { status: 200 });
}
```

---

## 7. Trust Score Computation + AI "Why This Score"

**File:** `supabase/functions/compute-trust-score/index.ts`

Called after every check-in. Uses the last 50 check-ins (or all if fewer). No score is computed until a provider has at least 1 check-in.

```typescript
serve(async (req) => {
  const { provider_id } = await req.json();
  if (!provider_id) return new Response("provider_id required", { status: 400 });

  // Fetch last 50 check-ins for this provider
  const { data: checkIns } = await supabase
    .from("check_ins")
    .select(`
      did_provider_show_up,
      arrival_delta_minutes,
      quality_rating,
      free_text,
      ai_photo_grade,
      submitted_at,
      bookings!inner(provider_id, created_at, updated_at)
    `)
    .eq("bookings.provider_id", provider_id)
    .order("submitted_at", { ascending: false })
    .limit(50);

  if (!checkIns || checkIns.length === 0) return new Response(JSON.stringify({ skipped: true }), { status: 200 });

  const n = checkIns.length;

  // --- RELIABILITY ---
  const showedUpCount = checkIns.filter((c: any) => c.did_provider_show_up).length;
  const showedUpRate = showedUpCount / n;

  const lateMinutes = checkIns
    .filter((c: any) => c.arrival_delta_minutes != null && c.arrival_delta_minutes > 0)
    .map((c: any) => c.arrival_delta_minutes!);
  const avgLate = lateMinutes.length > 0 ? lateMinutes.reduce((a: number, b: number) => a + b, 0) / lateMinutes.length : 0;
  const punctualityBonus = Math.max(0, (15 - avgLate) / 15);

  const reliability = Math.round((showedUpRate * 0.7 + punctualityBonus * 0.3) * 100 * 100) / 100;

  // --- QUALITY ---
  const qualityMap: Record<string, number> = {
    needs_improvement: 0,
    satisfactory: 70,
    above_and_beyond: 100
  };
  const baseQuality = checkIns.reduce((sum: number, c: any) => sum + (qualityMap[c.quality_rating] ?? 70), 0) / n;

  // AI photo grade modifier
  const gradedCheckIns = checkIns.filter((c: any) => c.ai_photo_grade != null);
  let aiModifier = 0;
  if (gradedCheckIns.length > 0) {
    const avgWorkQuality = gradedCheckIns.map((c: any) => {
      const wq = c.ai_photo_grade?.work_quality;
      if (wq === "excellent" || wq === "good") return 1;
      if (wq === "poor") return -1;
      return 0;
    });
    const avgScore = avgWorkQuality.reduce((a: number, b: number) => a + b, 0) / avgWorkQuality.length;
    aiModifier = avgScore * 5;  // ±5 points
  }
  const quality = Math.min(100, Math.max(0, Math.round((baseQuality + aiModifier) * 100) / 100));

  // --- COMMUNICATION ---
  // Derived from booking acceptance speed (fetched separately) + free-text sentiment
  const acceptanceSpeedScore = await computeAcceptanceSpeedScore(provider_id);
  const sentimentScore = await computeSentimentScore(checkIns);
  const communication = Math.round((acceptanceSpeedScore * 0.6 + sentimentScore * 0.4) * 100 * 100) / 100;

  // --- PROFESSIONALISM ---
  const { disputePenalty, fraudPenalty } = await computePenalties(provider_id);
  const professionalismMentions = await computeProfessionalismMentions(checkIns);
  const professionalism = Math.min(100, Math.max(0, 85 - disputePenalty - fraudPenalty + professionalismMentions));

  const composite = Math.round(
    (reliability * 0.35 + quality * 0.35 + communication * 0.15 + professionalism * 0.15) * 100
  ) / 100;

  // --- Generate "Why" texts via Claude Haiku ---
  const [whyReliability, whyQuality, whyCommunication, whyProfessionalism] = await Promise.all([
    generateWhyText("reliability", reliability, { showedUpRate, avgLate, n }),
    generateWhyText("quality", quality, { baseQuality, aiModifier, n }),
    generateWhyText("communication", communication, { acceptanceSpeedScore, sentimentScore, n }),
    generateWhyText("professionalism", professionalism, { disputePenalty, fraudPenalty, professionalismMentions, n })
  ]);

  // --- Upsert trust_scores ---
  await supabase
    .from("trust_scores")
    .upsert({
      provider_id,
      reliability_score: reliability,
      quality_score: quality,
      communication_score: communication,
      professionalism_score: professionalism,
      why_reliability: whyReliability,
      why_quality: whyQuality,
      why_communication: whyCommunication,
      why_professionalism: whyProfessionalism,
      check_ins_used: n,
      last_computed_at: new Date().toISOString()
    }, { onConflict: "provider_id" });

  // --- Insert history snapshot ---
  await supabase.from("trust_score_history").insert({
    provider_id,
    composite_score: composite,
    reliability_score: reliability,
    quality_score: quality,
    communication_score: communication,
    professionalism_score: professionalism,
    snapshot_at: new Date().toISOString()
  });

  return new Response(JSON.stringify({ composite, reliability, quality, communication, professionalism }), { status: 200 });
});

async function generateWhyText(component: string, score: number, stats: Record<string, any>): Promise<string> {
  const statsStr = Object.entries(stats)
    .map(([k, v]) => `${k}=${typeof v === "number" ? Math.round(v * 100) / 100 : v}`)
    .join(", ");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 60,
    messages: [
      {
        role: "user",
        content: `Generate one factual sentence (under 20 words) explaining a home service provider's ${component} score of ${score}/100.
Recent data: ${statsStr}.
Format: Start with what they do well (or why it's lower). Be specific. No filler words. No quotation marks.
Examples: "Shows up on time or early for 94% of jobs." / "3 of last 10 jobs had quality issues flagged by homeowners."`
      }
    ]
  });

  return response.content[0].type === "text" ? response.content[0].text.trim() : "";
}

async function computeAcceptanceSpeedScore(providerId: string): Promise<number> {
  // Compare booking.created_at to booking.updated_at when status changed to confirmed
  // Faster acceptance = higher score. Benchmark: <5 min = 1.0, >60 min = 0.3
  const { data: bookings } = await supabase
    .from("bookings")
    .select("created_at, updated_at")
    .eq("provider_id", providerId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!bookings?.length) return 0.7; // Default mid-range

  const avgMinutes = bookings.reduce((sum: number, b: any) => {
    const diffMs = new Date(b.updated_at).getTime() - new Date(b.created_at).getTime();
    return sum + diffMs / 60000;
  }, 0) / bookings.length;

  if (avgMinutes < 5) return 1.0;
  if (avgMinutes < 15) return 0.9;
  if (avgMinutes < 30) return 0.75;
  if (avgMinutes < 60) return 0.6;
  return 0.4;
}

async function computeSentimentScore(checkIns: any[]): Promise<number> {
  const texts = checkIns.filter((c) => c.free_text).map((c) => c.free_text);
  if (texts.length === 0) return 0.7;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 10,
    messages: [
      {
        role: "user",
        content: `Rate the overall sentiment of these homeowner reviews about a service provider on a scale of 0.0 to 1.0. Return only a number.

Reviews:
${texts.slice(0, 20).map((t, i) => `${i + 1}. "${t}"`).join("\n")}`
      }
    ]
  });

  const text = response.content[0].type === "text" ? response.content[0].text.trim() : "0.7";
  return Math.min(1, Math.max(0, parseFloat(text) || 0.7));
}

async function computePenalties(providerId: string): Promise<{ disputePenalty: number; fraudPenalty: number }> {
  const { count: disputes } = await supabase
    .from("claims")
    .select("id", { count: "exact" })
    .eq("provider_id", providerId)
    .in("status", ["resolved_homeowner_favor", "under_review"]);

  const { count: fraudFlags } = await supabase
    .from("check_ins")
    .select("id", { count: "exact" })
    .contains("ai_photo_grade", { fraud_detected: true });

  return {
    disputePenalty: Math.min(30, (disputes ?? 0) * 8),
    fraudPenalty: Math.min(20, (fraudFlags ?? 0) * 10)
  };
}

async function computeProfessionalismMentions(checkIns: any[]): Promise<number> {
  const positiveKeywords = ["professional", "polite", "respectful", "courteous", "friendly", "on time", "great attitude"];
  const texts = checkIns.filter((c) => c.free_text).map((c: any) => c.free_text!.toLowerCase());
  const mentions = texts.filter((t) => positiveKeywords.some((kw) => t.includes(kw))).length;
  return Math.min(15, mentions * 3);
}
```

---

## 8. Google Calendar Two-Way Sync

### 8.1 OAuth Setup

**File:** `supabase/functions/google-calendar-oauth/index.ts`

```typescript
// Called from GET /api/providers/me/calendar/connect?code=...
serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const providerId = url.searchParams.get("state"); // Pass provider_id as OAuth state

  if (!code || !providerId) return new Response("Missing code or state", { status: 400 });

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      redirect_uri: `${Deno.env.get("APP_URL")}/api/providers/me/calendar/connect`,
      grant_type: "authorization_code"
    })
  });
  const tokens = await tokenRes.json();

  // Encrypt tokens before storage
  const encrypted = await encryptToken(tokens.access_token);
  const encryptedRefresh = await encryptToken(tokens.refresh_token);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Get default calendar ID
  const calendarRes = await fetch("https://www.googleapis.com/calendar/v3/calendarList/primary", {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  const calendar = await calendarRes.json();

  await supabase
    .from("calendar_syncs")
    .upsert({
      provider_id: providerId,
      calendar_provider: "google",
      access_token_encrypted: encrypted,
      refresh_token_encrypted: encryptedRefresh,
      token_expires_at: expiresAt,
      calendar_id: calendar.id ?? "primary",
      sync_status: "active"
    }, { onConflict: "provider_id,calendar_provider" });

  return Response.redirect(`${Deno.env.get("APP_URL")}/dashboard/calendar?connected=true`, 302);
});

// AES-256-GCM encryption using CALENDAR_TOKEN_ENCRYPTION_KEY
async function encryptToken(plaintext: string): Promise<string> {
  const keyHex = Deno.env.get("CALENDAR_TOKEN_ENCRYPTION_KEY")!;
  const keyBytes = hexToBytes(keyHex);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  // Return iv + ciphertext as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptToken(encrypted: string): Promise<string> {
  const keyHex = Deno.env.get("CALENDAR_TOKEN_ENCRYPTION_KEY")!;
  const keyBytes = hexToBytes(keyHex);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
```

### 8.2 HomeBase → Google (Push on Booking Confirmation)

```typescript
// Called from booking confirmation flow
export async function createCalendarEvent(booking: any, provider: any) {
  const { data: calSync } = await supabase
    .from("calendar_syncs")
    .select("*")
    .eq("provider_id", provider.id)
    .eq("sync_status", "active")
    .single();

  if (!calSync) return;  // Provider hasn't connected calendar

  const accessToken = await getValidAccessToken(calSync);
  const start = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`);
  const end = new Date(start.getTime() + booking.duration_minutes * 60000);

  const event = {
    summary: `HomeBase: ${booking.service_category} at ${booking.city}`,
    description: `HomeBase Job #${booking.id.slice(0, 8)}\nAddress: ${booking.address_line1}, ${booking.city}, ${booking.state}\nNotes: ${booking.special_instructions ?? "None"}`,
    start: { dateTime: start.toISOString(), timeZone: "America/Chicago" },
    end: { dateTime: end.toISOString(), timeZone: "America/Chicago" },
    extendedProperties: { private: { homebase_booking_id: booking.id } }
  };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calSync.calendar_id}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    }
  );

  if (res.ok) {
    const created = await res.json();
    await supabase
      .from("bookings")
      .update({ google_calendar_event_id: created.id })
      .eq("id", booking.id);
  }
}

async function getValidAccessToken(calSync: any): Promise<string> {
  const expiresAt = new Date(calSync.token_expires_at).getTime();
  const fiveMinutes = 5 * 60 * 1000;

  if (Date.now() < expiresAt - fiveMinutes) {
    return decryptToken(calSync.access_token_encrypted);
  }

  // Token expired or expiring — refresh
  const refreshToken = await decryptToken(calSync.refresh_token_encrypted);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      grant_type: "refresh_token"
    })
  });

  const tokens = await tokenRes.json();
  if (!tokens.access_token) {
    await supabase
      .from("calendar_syncs")
      .update({ sync_status: "expired" })
      .eq("id", calSync.id);
    throw new Error("Token refresh failed");
  }

  const newEncrypted = await encryptToken(tokens.access_token);
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase
    .from("calendar_syncs")
    .update({
      access_token_encrypted: newEncrypted,
      token_expires_at: newExpiresAt,
      last_synced_at: new Date().toISOString()
    })
    .eq("id", calSync.id);

  return tokens.access_token;
}
```

### 8.3 Google → HomeBase (Polling, Every 15 Min)

**File:** `supabase/functions/sync-google-calendar/index.ts`

```typescript
serve(async () => {
  const { data: syncs } = await supabase
    .from("calendar_syncs")
    .select("*, providers(id)")
    .eq("sync_status", "active")
    .eq("calendar_provider", "google");

  for (const sync of syncs ?? []) {
    try {
      const accessToken = await getValidAccessToken(sync);
      const now = new Date();
      const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const updatedMin = sync.last_synced_at ?? new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const eventsRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${sync.calendar_id}/events?` +
        new URLSearchParams({
          timeMin: now.toISOString(),
          timeMax: in14Days.toISOString(),
          updatedMin,
          singleEvents: "true"
        }),
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const eventsData = await eventsRes.json();

      for (const event of eventsData.items ?? []) {
        // Skip events created by HomeBase
        if (event.extendedProperties?.private?.homebase_booking_id) continue;

        const eventStart = new Date(event.start.dateTime ?? event.start.date);
        const eventEnd = new Date(event.end.dateTime ?? event.end.date);
        const eventDate = eventStart.toISOString().split("T")[0];

        // Check if this overlaps a confirmed HomeBase booking
        const { data: conflicts } = await supabase
          .from("bookings")
          .select("id")
          .eq("provider_id", sync.providers.id)
          .eq("scheduled_date", eventDate)
          .in("status", ["confirmed", "en_route", "in_progress"]);

        // Regardless of conflict, block this time to prevent new routing
        await supabase
          .from("provider_blocked_times")
          .upsert({
            provider_id: sync.providers.id,
            blocked_date: eventDate,
            start_time: event.start.dateTime ? eventStart.toTimeString().slice(0, 8) : null,
            end_time: event.end.dateTime ? eventEnd.toTimeString().slice(0, 8) : null,
            all_day: !!event.start.date,
            reason: `External calendar: ${event.summary ?? "Busy"}`
          });
      }

      await supabase
        .from("calendar_syncs")
        .update({ last_synced_at: now.toISOString() })
        .eq("id", sync.id);

    } catch (err) {
      await supabase
        .from("calendar_syncs")
        .update({ sync_status: "error" })
        .eq("id", sync.id);
    }
  }

  return new Response(JSON.stringify({ synced: syncs?.length ?? 0 }), { status: 200 });
});
```

---

## 9. Push Notifications (10 Types)

**File:** `supabase/functions/send-push-notification/index.ts`

All other Edge Functions call this function with `{ user_id, type, title, body, data }`. The function resolves the Expo push token(s) for the user and fires the notification.

```typescript
// Store Expo push tokens in a separate table (not in schema above — add this migration)
// CREATE TABLE push_tokens (
//   id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
//   token       text NOT NULL,
//   platform    varchar(10),  -- 'ios' | 'android'
//   created_at  timestamptz DEFAULT now(),
//   CONSTRAINT uq_push_token UNIQUE (user_id, token)
// );

serve(async (req) => {
  const { user_id, type, title, body, data } = await req.json();

  // Store in notifications table
  await supabase.from("notifications").insert({ user_id, type, title, body, data });

  // Get user's push tokens
  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", user_id);

  if (!tokens?.length) return new Response(JSON.stringify({ sent: false, reason: "no_tokens" }), { status: 200 });

  const messages = tokens.map((t: any) => ({
    to: t.token,
    sound: "default",
    title,
    body,
    data: { type, ...data }
  }));

  const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("EXPO_ACCESS_TOKEN")}`
    },
    body: JSON.stringify(messages)
  });

  return new Response(JSON.stringify({ sent: true, count: messages.length }), { status: 200 });
});
```

### Notification Trigger Map

| Type | Trigger | Recipient | Title | Body |
|---|---|---|---|---|
| `booking_matched` | Booking status → `matched` | Provider | "New job available" | "New {service} on {date}. Accept within 15 minutes." |
| `booking_confirmed` | Provider accepts booking | Homeowner | "{Provider} confirmed!" | "{Provider} confirmed your {service} booking on {date}." |
| `booking_declined` | Provider declines | Homeowner | "Finding another provider" | "Don't worry — we're finding you another great provider." |
| `job_completed_checkin` | Booking status → `completed` | Homeowner | "How did it go?" | "Rate {provider}'s service. Takes 15 seconds." |
| `checkin_reminder` | 30 min after completed, no check-in | Homeowner | "Don't forget to rate" | "Rate {provider}'s work from today before it expires." |
| `payout_sent` | Stripe `transfer.created` event | Provider | "Payment on the way" | "${amount} is on its way to your bank." |
| `instant_payout_ready` | Provider balance > $10 | Provider | "Cash out instantly" | "You have ${balance} available. Cash out now for 1% fee." |
| `claim_update` | Claim status changes | Both parties | "Claim update" | "Your damage claim for job #{id} has been updated." |
| `verification_approved` | Verification doc approved | Provider | "Verification approved" | "Congrats! You're now Tier 2 verified on HomeBase." |
| `booking_cancelled` | Booking status → `cancelled` | Both | "Booking cancelled" | "Your {service} booking on {date} was cancelled. [details]" |

**DB trigger for `job_completed_checkin`:**

```sql
-- Fire Edge Function when booking moves to 'completed'
CREATE OR REPLACE FUNCTION notify_checkin_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM net.http_post(
      url := current_setting('app.supabase_functions_url') || '/send-push-notification',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'booking_id', NEW.id,
        'provider_id', NEW.provider_id,
        'homeowner_id', NEW.homeowner_id,
        'notify_checkin', true
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_completed
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION notify_checkin_trigger();
```

---

## 10. Verification System

### 10.1 Tier 1 — Background Check (Checkr)

```typescript
// Called from POST /api/providers/verify/tier1
export async function initiateBackgroundCheck(provider: any, consentData: any) {
  // consentData: { full_name, dob, ssn_last4, address }
  // SSN last 4 is passed to Checkr API only — NEVER stored in HomeBase database

  const checkrRes = await fetch("https://api.checkr.com/v1/candidates", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(Deno.env.get("CHECKR_API_KEY")! + ":")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      first_name: consentData.full_name.split(" ")[0],
      last_name: consentData.full_name.split(" ").slice(1).join(" "),
      dob: consentData.dob,       // Format: YYYY-MM-DD
      ssn: consentData.ssn_last4, // Checkr accepts last 4 in some packages
      email: consentData.email
    })
  });

  const candidate = await checkrRes.json();

  // Create report (background check order)
  const reportRes = await fetch("https://api.checkr.com/v1/reports", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(Deno.env.get("CHECKR_API_KEY")! + ":")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      package: "tasker_standard",
      candidate_id: candidate.id,
      node: "root"
    })
  });

  const report = await reportRes.json();

  await supabase
    .from("providers")
    .update({ background_check_status: "pending" })
    .eq("id", provider.id);

  return { candidate_id: candidate.id, report_id: report.id };
}

// Checkr webhook handler
export async function handleCheckrWebhook(event: any) {
  if (event.type === "report.completed") {
    const report = event.data.object;
    const candidateId = report.candidate_id;
    const passed = report.status === "clear";

    // Look up provider by Checkr candidate ID (store candidate_id temporarily in providers metadata)
    const { data: provider } = await supabase
      .from("providers")
      .select("id, user_id")
      .eq("checkr_candidate_id", candidateId)
      .single();

    if (!provider) return;

    await supabase
      .from("providers")
      .update({
        background_check_status: passed ? "passed" : "failed",
        verification_tier: passed ? 1 : 0
      })
      .eq("id", provider.id);

    if (passed) {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: provider.user_id,
          type: "verification_approved",
          title: "Background check passed",
          body: "You're now Tier 1 verified. You can accept one-off jobs on HomeBase.",
          data: { tier: 1 }
        }
      });
    }
  }
}
```

### 10.2 Tier 2 — Insurance Upload

```typescript
// Called from POST /api/providers/verify/tier2
export async function submitInsuranceCert(providerId: string, userId: string, file: File) {
  // Upload to private bucket
  const path = `verification/${providerId}/insurance_cert_${Date.now()}.${file.name.split(".").pop()}`;
  const { error } = await supabase.storage
    .from("verification-docs")   // Private bucket — no public access
    .upload(path, file, { upsert: true });

  if (error) throw error;

  await supabase.from("verification_documents").insert({
    provider_id: providerId,
    doc_type: "insurance_cert",
    status: "pending",
    file_url: path
  });

  // Notify ops team
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "ops@homebase.com",
      to: ["ops@homebase.com"],
      subject: "New Tier 2 insurance cert pending review",
      html: `<p>Provider <strong>${providerId}</strong> has uploaded an insurance certificate for review.</p><p>Review in the <a href="${Deno.env.get("APP_URL")}/admin/providers/${providerId}">admin dashboard</a>.</p>`
    })
  });
}

// Called from PUT /api/admin/providers/:id/verify (admin only)
export async function approveInsuranceCert(docId: string, adminUserId: string, expiresAt: string) {
  const { data: doc } = await supabase
    .from("verification_documents")
    .select("provider_id")
    .eq("id", docId)
    .single();

  await supabase
    .from("verification_documents")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: adminUserId })
    .eq("id", docId);

  await supabase
    .from("providers")
    .update({
      verification_tier: 2,
      is_insured: true,
      insurance_expires_at: expiresAt
    })
    .eq("id", doc.provider_id);

  // Get provider user_id for push notification
  const { data: provider } = await supabase
    .from("providers")
    .select("user_id")
    .eq("id", doc.provider_id)
    .single();

  await supabase.functions.invoke("send-push-notification", {
    body: {
      user_id: provider.user_id,
      type: "verification_approved",
      title: "You're now Tier 2 verified!",
      body: "Congrats! You can now accept subscription bookings on HomeBase.",
      data: { tier: 2 }
    }
  });
}
```

### 10.3 Insurance Expiry Check (Daily pg_cron)

**File:** `supabase/functions/check-verification-expiry/index.ts`

```typescript
serve(async () => {
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  // Providers expiring within 30 days
  const { data: expiring } = await supabase
    .from("providers")
    .select("id, user_id, business_name, insurance_expires_at")
    .lte("insurance_expires_at", thirtyDaysFromNow)
    .gte("insurance_expires_at", today)
    .eq("verification_tier", 2);

  for (const provider of expiring ?? []) {
    const daysLeft = Math.ceil(
      (new Date(provider.insurance_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    await supabase.functions.invoke("send-push-notification", {
      body: {
        user_id: provider.user_id,
        type: "verification_expiry_warning",
        title: "Insurance expiring soon",
        body: `Your insurance certificate expires in ${daysLeft} days. Upload a new one to keep your Tier 2 status.`,
        data: { days_left: daysLeft }
      }
    });
  }

  // Providers whose insurance already expired — downgrade tier
  const { data: expired } = await supabase
    .from("providers")
    .select("id")
    .lt("insurance_expires_at", today)
    .eq("verification_tier", 2);

  for (const provider of expired ?? []) {
    await supabase
      .from("providers")
      .update({ verification_tier: 1, is_insured: false, background_check_status: "expired" })
      .eq("id", provider.id);
  }

  return new Response(JSON.stringify({ expiring: expiring?.length, expired: expired?.length }), { status: 200 });
});
```

---

## 11. Damage Claims

### 11.1 Filing a Claim

```typescript
// POST /api/claims — homeowner only, within 72 hours of completion
export async function fileClaim(homeownerId: string, payload: any) {
  const { booking_id, incident_description, photo_urls, estimated_damage_cost } = payload;

  // Validate booking
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, homeowner_id, provider_id, updated_at, stripe_payment_intent_id, stripe_transfer_id")
    .eq("id", booking_id)
    .eq("homeowner_id", homeownerId)
    .single();

  if (!booking) throw new Error("Booking not found or unauthorized");
  if (booking.status !== "completed") throw new Error("Only completed bookings can have claims filed");

  const completedAt = new Date(booking.updated_at);
  const hoursSinceCompletion = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceCompletion > 72) throw new Error("Claim window has closed (72 hours after completion)");

  // Check no existing open claim
  const { data: existing } = await supabase
    .from("claims")
    .select("id")
    .eq("booking_id", booking_id)
    .neq("status", "closed")
    .single();

  if (existing) throw new Error("A claim already exists for this booking");

  // Upload claim photos to private storage
  // (photos are base64 or URLs — client uploads to Supabase Storage directly, passes paths)

  // Freeze any pending payout — set escrow_held back to true
  if (!booking.stripe_transfer_id) {
    await supabase
      .from("bookings")
      .update({ escrow_held: true, escrow_release_at: null })
      .eq("id", booking_id);
  }

  const { data: claim } = await supabase
    .from("claims")
    .insert({
      booking_id,
      homeowner_id: homeownerId,
      provider_id: booking.provider_id,
      incident_description,
      photo_urls: photo_urls ?? [],
      estimated_damage_cost: estimated_damage_cost ?? null,
      status: "open"
    })
    .select()
    .single();

  // Notify ops
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "noreply@homebase.com",
      to: ["ops@homebase.com"],
      subject: `New damage claim #${claim.id.slice(0, 8)} filed`,
      html: `<p>Booking ${booking_id} has a new damage claim. Estimated cost: $${estimated_damage_cost ?? "unspecified"}.</p>`
    })
  });

  // Notify provider
  const { data: provider } = await supabase
    .from("providers")
    .select("user_id")
    .eq("id", booking.provider_id)
    .single();

  await supabase.functions.invoke("send-push-notification", {
    body: {
      user_id: provider.user_id,
      type: "claim_update",
      title: "Damage claim filed",
      body: `A damage claim has been filed for job #${booking_id.slice(0, 8)}. HomeBase is reviewing.`,
      data: { claim_id: claim.id, booking_id }
    }
  });

  return claim;
}
```

### 11.2 Claim Resolution

```typescript
// PUT /api/admin/claims/:id/resolve — admin only
export async function resolveClaim(claimId: string, resolution: string, notes: string, adminUserId: string) {
  const { data: claim } = await supabase
    .from("claims")
    .select("*, bookings(stripe_payment_intent_id, provider_payout, final_price, estimated_price, provider_id, homeowner_id)")
    .eq("id", claimId)
    .single();

  await supabase
    .from("claims")
    .update({ status: resolution, resolution_notes: notes, resolved_at: new Date().toISOString() })
    .eq("id", claimId);

  const booking = claim.bookings;
  const piId = booking.stripe_payment_intent_id;

  switch (resolution) {
    case "resolved_homeowner_favor": {
      // Full refund to homeowner, payout frozen
      await stripe.refunds.create({ payment_intent: piId });

      // Trust score quality penalty for provider
      await supabase.functions.invoke("compute-trust-score", {
        body: { provider_id: claim.provider_id, dispute_override: true }
      });
      break;
    }
    case "resolved_provider_favor": {
      // Release payout to provider
      await supabase
        .from("bookings")
        .update({ escrow_held: false, escrow_release_at: new Date().toISOString() })
        .eq("id", claim.booking_id);
      await supabase.functions.invoke("release-escrow", { body: {} });
      break;
    }
    case "resolved_split": {
      // Partial refund to homeowner, partial payout to provider
      // Split logic: refund 50% to homeowner, pay 50% to provider
      const totalCents = Math.round((booking.final_price ?? booking.estimated_price) * 100);
      await stripe.refunds.create({ payment_intent: piId, amount: Math.floor(totalCents / 2) });
      // Manual transfer for provider portion
      const { data: provider } = await supabase
        .from("providers")
        .select("stripe_account_id")
        .eq("id", claim.provider_id)
        .single();
      await stripe.transfers.create({
        amount: Math.floor(totalCents / 2),
        currency: "usd",
        destination: provider.stripe_account_id
      });
      break;
    }
  }

  // Notify both parties
  const [homeownerUser, providerUser] = await Promise.all([
    supabase.from("homeowners").select("user_id").eq("id", claim.homeowner_id).single(),
    supabase.from("providers").select("user_id").eq("id", claim.provider_id).single()
  ]);

  const humanResolution: Record<string, string> = {
    resolved_homeowner_favor: "resolved in your favor",
    resolved_provider_favor: "resolved in the provider's favor",
    resolved_split: "resolved with a split outcome"
  };

  for (const userId of [homeownerUser.data?.user_id, providerUser.data?.user_id].filter(Boolean)) {
    await supabase.functions.invoke("send-push-notification", {
      body: {
        user_id: userId,
        type: "claim_update",
        title: "Claim resolved",
        body: `Your damage claim has been ${humanResolution[resolution] ?? "closed"}.`,
        data: { claim_id: claimId }
      }
    });
  }
}
```

---

## 12. Subscription Lifecycle Management

**File:** `supabase/functions/create-subscription-bookings/index.ts`

```typescript
serve(async () => {
  const today = new Date().toISOString().split("T")[0];
  const MAX_RETRIES = 3;

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("status", "active")
    .lte("next_booking_date", today);

  let created = 0;
  let failed = 0;

  for (const sub of subs ?? []) {
    // Check how many consecutive routing failures we've had for this subscription
    const { count: recentFailures } = await supabase
      .from("bookings")
      .select("id", { count: "exact" })
      .eq("subscription_id", sub.id)
      .eq("status", "cancelled")
      .gte("created_at", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());

    if ((recentFailures ?? 0) >= MAX_RETRIES) {
      // Alert homeowner, stop generating for now
      const { data: homeowner } = await supabase
        .from("homeowners")
        .select("user_id")
        .eq("id", sub.homeowner_id)
        .single();

      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: homeowner?.user_id,
          type: "booking_cancelled",
          title: "Subscription booking issue",
          body: "We couldn't find a provider for your recurring booking 3 times in a row. Please contact support.",
          data: { subscription_id: sub.id }
        }
      });
      continue;
    }

    // Create booking for today's occurrence
    const { data: booking } = await supabase
      .from("bookings")
      .insert({
        homeowner_id: sub.homeowner_id,
        service_category: sub.service_category,
        booking_type: "subscription",
        status: "pending_match",
        scheduled_date: sub.next_booking_date,
        scheduled_time: sub.scheduled_time,
        duration_minutes: 60,
        address_line1: sub.address_line1,
        city: sub.city,
        state: sub.state,
        zip_code: sub.zip_code,
        estimated_price: await estimatePrice(sub.service_category, sub.zip_code),
        platform_take_rate: 0.10,  // Subscription rate
        subscription_id: sub.id
      })
      .select()
      .single();

    if (!booking) { failed++; continue; }

    // Route with loyalty bonus
    const routeResult = await supabase.functions.invoke("route-booking", {
      body: {
        booking_id: booking.id,
        service_category: sub.service_category,
        zip_code: sub.zip_code,
        scheduled_date: sub.next_booking_date,
        scheduled_time: sub.scheduled_time,
        duration_minutes: 60,
        homeowner_id: sub.homeowner_id,
        subscription_id: sub.id,
        is_subscription: true
      }
    });

    // Advance next_booking_date
    const nextDate = computeNextDate(sub.next_booking_date, sub.frequency, sub.day_of_week);
    await supabase
      .from("subscriptions")
      .update({ next_booking_date: nextDate })
      .eq("id", sub.id);

    created++;
  }

  return new Response(JSON.stringify({ created, failed }), { status: 200 });
});

function computeNextDate(current: string, frequency: string, dayOfWeek: number): string {
  const date = new Date(current);
  switch (frequency) {
    case "weekly": date.setDate(date.getDate() + 7); break;
    case "biweekly": date.setDate(date.getDate() + 14); break;
    case "monthly": date.setMonth(date.getMonth() + 1); break;
  }
  return date.toISOString().split("T")[0];
}

async function estimatePrice(serviceCategory: string, zipCode: string): Promise<number> {
  // Use completion_ledger median for the zip + category
  const { data } = await supabase
    .from("completion_ledger")
    .select("final_price")
    .eq("service_category", serviceCategory)
    .eq("zip_code", zipCode)
    .order("completed_at", { ascending: false })
    .limit(20);

  if (!data?.length) return serviceCategory === "lawn" ? 75 : 120; // Fallback defaults

  const prices = data.map((r: any) => r.final_price).sort((a: number, b: number) => a - b);
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
}
```

---

## 13. Supabase Edge Functions Summary

| Function | File | Trigger | Description |
|---|---|---|---|
| `route-booking` | `route-booking/index.ts` | HTTP POST, pg_cron | Scoring algorithm → assigns provider → notifies |
| `process-checkin` | `process-checkin/index.ts` | HTTP POST, pg_cron | Validates, grades with Claude Vision, triggers trust compute |
| `compute-trust-score` | `compute-trust-score/index.ts` | HTTP POST (called by process-checkin) | Full 4-component recomputation + "why" text |
| `release-escrow` | `release-escrow/index.ts` | HTTP POST, pg_cron (every 30 min) | Creates Stripe transfers for cleared escrow bookings |
| `sync-google-calendar` | `sync-google-calendar/index.ts` | pg_cron (every 15 min) | Polls Google Calendar, writes provider_blocked_times |
| `google-calendar-oauth` | `google-calendar-oauth/index.ts` | HTTP GET (OAuth callback) | Exchanges code for tokens, stores encrypted |
| `create-subscription-bookings` | `create-subscription-bookings/index.ts` | pg_cron (daily 5am) | Creates booking records for due subscriptions, invokes route-booking |
| `handle-stripe-webhook` | `handle-stripe-webhook/index.ts` | HTTP POST (Stripe webhook) | Handles all Stripe events |
| `send-push-notification` | `send-push-notification/index.ts` | HTTP POST (called by all functions) | Unified push sender via Expo |
| `check-verification-expiry` | `check-verification-expiry/index.ts` | pg_cron (daily 6am) | Sends expiry warnings, downgrades expired certs |

**Deploying:**
```bash
supabase functions deploy route-booking
supabase functions deploy process-checkin
supabase functions deploy compute-trust-score
supabase functions deploy release-escrow
supabase functions deploy sync-google-calendar
supabase functions deploy google-calendar-oauth
supabase functions deploy create-subscription-bookings
supabase functions deploy handle-stripe-webhook
supabase functions deploy send-push-notification
supabase functions deploy check-verification-expiry
```

---

## 14. API Endpoint Reference

All endpoints are implemented as Supabase Edge Functions or Postgres functions called via the Supabase client SDK. REST API paths below map to the frontend calling pattern.

### Auth (Supabase native)

| Method | Path | Description |
|---|---|---|
| POST | `/auth/signup` | Create user account. Body: `{email, password, full_name, role}`. Auto-creates profile. |
| POST | `/auth/signin` | Sign in. Returns `access_token`, `refresh_token`. |
| POST | `/auth/signout` | Invalidate session. |
| GET | `/auth/user` | Current user profile. |

### Onboarding

| Method | Path | Auth | Key Fields |
|---|---|---|---|
| POST | `/api/providers/onboard` | provider | `{business_name, service_categories[], service_areas[], availability[]}` |
| POST | `/api/homeowners/onboard` | homeowner | `{address_line1, city, state, zip_code}` → geocodes lat/lng via Maps API |
| GET | `/api/providers/stripe/onboarding-link` | provider | Returns `{url: "https://connect.stripe.com/..."}` |
| POST | `/api/providers/verify/tier2` | provider | Multipart upload: insurance cert file |

### Discovery

| Method | Path | Auth | Key Fields |
|---|---|---|---|
| GET | `/api/providers/search` | public | Query: `?service_category=lawn&zip_code=78701&date=2026-05-10` → Returns scored provider list with trust scores |
| GET | `/api/providers/:id` | public | Returns provider profile, trust_score, service_areas, availability |

### Bookings

| Method | Path | Auth | Request Body / Response |
|---|---|---|---|
| POST | `/api/bookings` | homeowner | `{service_category, booking_type, scheduled_date, scheduled_time, duration_minutes?, address, special_instructions?}` → triggers route-booking |
| GET | `/api/bookings` | homeowner | Returns paginated list: `[{id, status, scheduled_date, provider_name, estimated_price}]` |
| GET | `/api/bookings/:id` | homeowner or provider | Full booking detail including check-in if exists |
| POST | `/api/bookings/:id/accept` | provider | No body. Sets status → `confirmed`. Triggers calendar event creation, payment authorization. |
| POST | `/api/bookings/:id/decline` | provider | No body. Triggers re-route. |
| PUT | `/api/bookings/:id/status` | provider | `{status: "en_route"|"in_progress"|"completed"}` |
| POST | `/api/check-ins` | homeowner | `{booking_id, did_show_up, quality_rating, free_text?, photo_urls[]?, consent_given}` |

### Subscriptions

| Method | Path | Auth | Key Fields |
|---|---|---|---|
| POST | `/api/subscriptions` | homeowner | `{service_category, frequency, day_of_week, scheduled_time, address}` |
| GET | `/api/subscriptions` | homeowner | Returns `[{id, service_category, frequency, status, next_booking_date}]` |
| PUT | `/api/subscriptions/:id/pause` | homeowner | No body. Sets status → `paused`. |
| PUT | `/api/subscriptions/:id/cancel` | homeowner | No body. Sets status → `cancelled`. Cancels upcoming matched bookings. |

### Payments

| Method | Path | Auth | Key Fields |
|---|---|---|---|
| POST | `/api/stripe/setup-intent` | homeowner | Returns `{client_secret}` for Stripe.js `confirmCardSetup()` |
| POST | `/api/stripe/payout` | provider | `{amount_cents}` → calls `stripe.payouts.create` with method: 'instant'. Returns `{payout_id}`. |
| GET | `/api/stripe/balance` | provider | Returns `{available: [{amount, currency}], pending: [{amount, currency}]}` from Stripe |
| POST | `/api/webhooks/stripe` | none (sig verified) | All Stripe webhook events |

### Claims

| Method | Path | Auth | Key Fields |
|---|---|---|---|
| POST | `/api/claims` | homeowner | `{booking_id, incident_description, photo_urls[], estimated_damage_cost?}` |
| GET | `/api/claims/:id` | homeowner or provider | Full claim detail with status |

### Provider Self-Service

| Method | Path | Auth | Key Fields |
|---|---|---|---|
| GET | `/api/providers/me/jobs` | provider | Returns upcoming jobs sorted by date with status, homeowner first name + initial |
| PUT | `/api/providers/me/availability` | provider | `{availability: [{day_of_week, start_time, end_time}]}` — replaces all existing |
| PUT | `/api/providers/me/service-areas` | provider | `{service_areas: [{zip_code, radius_miles}]}` — replaces all existing |
| POST | `/api/providers/me/calendar/connect` | provider | OAuth callback with `?code=&state=provider_id`. Returns redirect. |

### Admin

| Method | Path | Auth | Key Fields |
|---|---|---|---|
| GET | `/api/admin/providers` | admin | Query: `?status=pending&verification_tier=0`. Returns paginated provider list. |
| PUT | `/api/admin/providers/:id/verify` | admin | `{doc_id, action: "approved"|"rejected", expires_at?}` |
| GET | `/api/admin/claims` | admin | Query: `?status=open`. Returns all open claims with booking detail. |
| PUT | `/api/admin/claims/:id/resolve` | admin | `{resolution: "resolved_homeowner_favor"|"resolved_provider_favor"|"resolved_split", notes}` |
| GET | `/api/admin/trust-scores/:provider_id` | admin | Full trust score breakdown with history |
| POST | `/api/admin/trust-scores/:provider_id/recompute` | admin | Force recompute trust score for a provider |

---

## 15. Security Checklist

Work through this before any public launch. All items are blocking.

- [ ] **RLS on all tables.** Test with: connect as `anon` role and confirm `SELECT * FROM homeowners` returns zero rows. Use `SET ROLE authenticated; SET request.jwt.claims = '{"sub":"<other_user_id>"}';` to simulate cross-user access.
- [ ] **Stripe webhook signature verification.** Every call to `handle-stripe-webhook` must call `stripe.webhooks.constructEvent()` before processing. Return HTTP 400 on failure — do not process.
- [ ] **Calendar OAuth tokens encrypted at rest.** Use AES-256-GCM with a key stored in Supabase Vault (not in code or `.env` files in production). The `CALENDAR_TOKEN_ENCRYPTION_KEY` must be a randomly generated 32-byte key.
- [ ] **Check-in photos in private Supabase Storage bucket.** Bucket `checkin-photos` must have RLS: no public access. Always serve via `createSignedUrl()` with 1-hour expiry. Never expose the raw storage path to clients.
- [ ] **Verification docs in private bucket.** Bucket `verification-docs` has the same rules. Signed URL access restricted to the owning provider and admins.
- [ ] **SSN last 4 never stored.** The `providers` table has no SSN column. The check-in flow never logs SSN fragments. Pass-through to Checkr only.
- [ ] **Rate limiting.** Add Supabase Edge Function rate limiting: 100 requests/min per IP on public endpoints (`/api/providers/search`, `/api/providers/:id`). Use Upstash Redis for rate limiting state if volume demands it.
- [ ] **Admin role check in every admin endpoint.** Never rely solely on auth — explicitly check `profiles.role = 'admin'` on every admin Edge Function before executing. A valid JWT is not sufficient.
- [ ] **Homeowner consent gate for AI photo processing.** In `process-checkin`, the block calling `gradePhotos()` is gated on `consent_given === true` AND `homeowner_consent_given` stored as `true` in the check_ins row. Do not call Claude Vision on photos without stored consent.
- [ ] **pg_cron uses service_role key.** All scheduled jobs in `019_pg_cron_jobs.sql` pass the service role key in the Authorization header. Never use the anon key for cron jobs.
- [ ] **Environment variables.** All secrets stored in Supabase Vault + GitHub Secrets (for CI). No secrets in `.env` files committed to version control. Confirm `.env` is in `.gitignore`.
- [ ] **CORS.** Edge Functions only allow `Origin: <APP_URL>` in production. Wildcard `*` is acceptable for local dev only.
- [ ] **Stripe Connect state parameter.** When redirecting homeowners or providers to Stripe, generate and verify a CSRF state parameter to prevent OAuth intercept attacks.
- [ ] **No plaintext tokens in logs.** Supabase Edge Function logs must not contain access tokens, Stripe keys, or SSN data. Review `console.log` calls before shipping.
