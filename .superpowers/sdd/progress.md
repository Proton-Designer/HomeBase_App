# Home Screen Redesign — Progress Ledger

Branch: feat/home-dashboard (to create)
Spec: home-centric homeowner dashboard (brainstorm + decisions in chat).

## Decisions
- Maps: KEYLESS stack — Photon (OSM) address autocomplete; Esri World Imagery satellite (all platforms via static export image). No API key.
- Reminders: computed client-side (seasonal templates + completion_ledger cadence). No new table.
- Top slot: adaptive hero (live job > upcoming booking > nudge), reuses realtime + JobStatusTimeline.
- Your Pros: derived from bookings.listForHomeowner (dedupe by providerId). No new API.

## Tasks
- [x] A1: DB migration — add lat/lng to addresses (migration add_lat_lng_to_addresses)
- [x] A2: lib/geo (photon + esri satellite url + states)
- [x] A3: addresses api + types (lat/lng/neighborhood/serviceInterests/formatAddress)
- [x] A4: authStore pending setup persists lat/lng
- [x] A5: lib/api/completions (homeowner completion_ledger read) + barrel
- [x] A6: lib/home utils (serviceMeta, reminders, yourPros, activeJob)
- [x] A7: booking rebook prefill (handleBook setMatchedProvider + match auto-select)
- foundation tsc: clean
- [x] C1: AddressAutocomplete component (onboarding)
- [x] C2: MyHomeCard component
- [x] C3: SearchIntentBar component
- [x] C4: AdaptiveHero component
- [x] C5: MaintenanceReminders section
- [x] C6: YourProsRow section
- [x] +jobs.listForHomeowner added (api/jobs.ts)
- [x] D1: assemble home index.tsx (+ demand_events wiring + realtime + cold-start)
- [x] D2: integrate AddressAutocomplete into address-setup.tsx
- [x] tsc clean (only known react-native-maps noise)
- [x] E: frontend-qa + code-reviewer review pass — all Critical/Important addressed
  - fixed: autocomplete spinner stuck after select; match.tsx infinite skeleton (null address); hero trust chip (providerScore added to jobs); hero loading skeleton; no-address prompt; a11y labels
  - deferred (out of scope, flagged to user): global palette (blue vs guide's forest green) + Fraunces font live in tokens/* and affect the whole app — not a home-screen change
- tsc: clean throughout (only known react-native-maps noise)
- NOT YET: live render / iOS sim smoke test (offered to user)
