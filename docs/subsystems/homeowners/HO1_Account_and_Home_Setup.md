# Homeowner · Subsystem 1 — Account & Home Setup

**Features & Exact Flow**
Marketplace MVP-1 · grounded in the built `(auth)` screens, with target-model notes

---

## Purpose of this subsystem

The homeowner's first touch with HomeBase: create an account and establish the home and its location. This subsystem produces the two things every downstream feature depends on — an authenticated identity, and a primary address whose ZIP scopes the entire local marketplace. Nothing else (search, shortlist, quotes, booking) can function until this is complete.

This document covers the homeowner side only. It reflects the screens currently built under `app/(auth)/` — welcome, sign-up, sign-in, address-setup, service-interest — and flags where the target model differs from what is built.

---

## Part 1 — Features

### Entry & account creation

**Welcome / landing**
- *Function:* First screen. Presents HomeBase's value ("verified pros in your neighborhood — no spam") and routes to Get Started (sign-up) or Sign in.
- *Purpose:* Orients a brand-new visitor and sets the trust-first tone before they commit to creating an account.

**Role selection (homeowner vs. provider)**
- *Function:* On sign-up, the user picks "I'm a homeowner" or "I run a service business", setting the account role.
- *Purpose:* A single codebase serves both sides; role selection routes the user into the correct onboarding path and experience.

**Sign up**
- *Function:* Collect first name, last name, email, password (min 8 chars), and optional phone; create a homeowner account via Supabase Auth.
- *Purpose:* Creates the authenticated identity that every booking, payment, message, and review is tied to.

**Email confirmation handling**
- *Function:* If the project requires email confirmation, show an "Almost there — confirm your email" state with a path back to sign in.
- *Purpose:* Ensures a valid, reachable email and a clean account before the homeowner proceeds.

**Sign in (returning homeowner)**
- *Function:* Email + password login for existing accounts, routing to the homeowner home on success.
- *Purpose:* The daily/return entry point; restores the homeowner's session and data.

### Home & location setup

**Add home address**
- *Function:* Capture street, city, state, ZIP, and an optional neighborhood. Saved as the primary address.
- *Purpose:* The address is the anchor of the entire marketplace — its ZIP determines which local providers are eligible and frames pricing context. Local-only matching depends on it.

**Service-interest selection**
- *Function:* The homeowner selects the services they're interested in (e.g. Lawn Care, Home Cleaning); some are shown as "soon" and disabled. Stored on the homeowner profile.
- *Purpose:* Personalizes the first experience and captures early demand signal; not a hard commitment — the homeowner can request any available service later.

**Persisted setup with safe flush**
- *Function:* Address + service interests are held as pending and written to the database (`addresses` + `homeowners` rows) once the account is authenticated; on failure they remain pending and retry on the next session.
- *Purpose:* Guarantees setup isn't lost to a transient error and that onboarding is only marked complete when the home record actually exists.

### Target-model additions (not yet built)

**Address verification / autocomplete**
- *Function:* Validate and standardize the entered address (e.g. via geocoding) and offer autocomplete.
- *Purpose:* Reduces bad-address errors that would mis-scope the marketplace or break routing; improves first-run polish.
- *Gap / note:* Currently the address is free-text. Geocoding/autocomplete is recommended for the target model to keep ZIP-based scoping reliable.

---

## Part 2 — Exact Flow

The built path, screen by screen. Three setup steps follow account creation (the app labels them "Step 1–3" across address and service-interest).

**Step 1 — Welcome**
- Homeowner opens the app and lands on the Welcome screen.
- Two actions: "Get started" (→ Sign up) or "Sign in" (→ returning users).

**Step 2 — Sign up (role = homeowner)**
- Homeowner taps Get started and selects "I'm a homeowner".
- Enters first name, last name, email, password (8+ chars), optional phone.
- Account is created via Supabase Auth. If email confirmation is required, the "Almost there" state appears; otherwise the homeowner proceeds.
- On success the app routes to address setup (providers would instead route to provider onboarding).

**Step 3 — Address setup (Step 2 of 3 in-app)**
- Homeowner enters street, city, state, ZIP, and optional neighborhood.
- Values are saved to pending homeowner setup (not yet written to the DB).
- Tap Continue → service interest.

**Step 4 — Service interest (Step 3 of 3 in-app)**
- Homeowner selects one or more services of interest; unavailable ones are shown as "soon" and disabled.
- Selections are added to pending setup.
- Tap Continue → the pending setup is flushed: an `addresses` row (primary) and a `homeowners` row are created.

**Step 5 — Flush & enter the app**
- If the writes succeed: pending setup clears, onboarding is marked complete, and the homeowner lands on the home tab.
- If a write fails (e.g. RLS or transient): pending setup is kept and retried on the next authenticated session; onboarding is NOT marked complete.

### Flow summary

**Welcome → Sign up (homeowner) → Address setup → Service interest → Flush (`addresses` + `homeowners`) → Home tab**

Returning homeowner: Welcome → Sign in → Home tab (setup already complete).

### What gets created in the database

| Record | Created when | Key fields |
|---|---|---|
| Supabase Auth user | Sign up | email, password, role |
| `profiles` row | Sign up (`handle_new_user` trigger) | name, role = homeowner |
| `addresses` row | Flush after service interest | street, city, state, zip, neighborhood, is_primary = true |
| `homeowners` row | Flush after service interest | id, primary_address_id |

### Edge cases & states the flow handles

- Email confirmation required → "Almost there" state with a route back to sign in.
- DB write fails on flush → setup kept pending, retried next session; onboarding not marked complete (no half-finished accounts).
- Returning homeowner with setup done → Sign in routes straight to the home tab.
- Provider chose the wrong role → role is selected explicitly at sign-up, routing each side to its own onboarding.

---

## Scope note — Built vs. target model

**What is built and final for this subsystem:**

- Welcome → role-based sign-up → single primary address → service interest → safe flush into `addresses` + `homeowners`.

**Target-model additions to layer in:**

- Address verification / autocomplete to keep ZIP-based scoping reliable (currently free-text).

One known downstream dependency worth flagging now: provider search currently reads the home ZIP from the transient pending-setup object, which becomes null after flush. The persisted home address (`addresses` / `homeowners`) should be the source of truth for ZIP in search — relevant the moment this subsystem feeds Subsystem 2 (Discovering a Provider).
