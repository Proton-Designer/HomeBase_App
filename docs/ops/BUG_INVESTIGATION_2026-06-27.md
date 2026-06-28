# HomeBase — Deep Bug Investigation (ultracode) — 2026-06-27

Method: 17 subsystem finder agents cross-referenced **actual code vs expected behavior** (per docs/subsystems + docs/ops/design), each finding **adversarially re-verified** against the live code. 5 false-positives filtered, 0 finder-missed-criticals on re-check. Plus live iOS-sim validation of auth + the sacred booking flow.

**Confirmed: 65 static + 1 dynamic.** Severity: critical 1, high 9, medium 24, low 31
## ✅ FIXED THIS SESSION (tsc-clean, uncommitted on feat/home-dashboard)

| ID | Sev | What was fixed |
|---|---|---|
| P1-onboarding-1 | CRITICAL | Edit-profile now **hydrates** the existing providers row on mount → Finish writes back real bio/prices/avatar/portfolio instead of wiping them. |
| P2-today-2 | HIGH | Provider check-in now **awaits** the completion_ledger capture and **surfaces** failure (no more success screen hiding a swallowed error). *Durable server-side ledger guarantee still recommended as follow-up.* |
| P3-jobs-1 | HIGH | Removed the fabricated 5-min expiry; Accept/Decline always show for a booking awaiting confirmation (also removed the now-dead countdown/ticker/`expiresAt`). |
| H1-auth-1 | HIGH | `flushPendingHomeownerSetup` now takes the authenticated id (passed from applySession) → no longer a silent no-op; address/interests persist. |
| P4-schedule-1 | HIGH | Week-agenda upper bound is now end-of-Sunday → Sunday jobs no longer dropped. |
| P3-jobs-3 | MED | Failed decline now **restores** the optimistically-removed request. |
| P3-jobs-5 | LOW | Dropped the misleading "as of in 3 hours" line (part of the request-card cleanup). |


### Additional fixes (batch 2):
| ID | Sev | What was fixed |
|---|---|---|
| P2-today-1 / P5-earnings-1 | HIGH | **Payout fee math.** Added `completion_ledger.net_cents` (migration + backfill), updated the `mock-payments` edge fn (v2) to store the real net at capture, and the Today KPI + Earnings history now read it (10% sub / 17.5% one-off) instead of a flat 90%. *Remaining: the "potential" estimate on not-yet-completed upcoming jobs in today.tsx still uses 90% — needs `booking_type` on the jobs query; minor (an estimate).* |
| H4-postjob-1 | HIGH | Accepted custom-quote amount now threads through (`bookingStore.quoteAmountCents`) so payment charges the agreed quote, not the provider's generic range midpoint. |

### Still open after this session (recommend next):
- **H5-subs-1** (change-frequency recompute of estimate + next_date — best as a server-side trigger)
- **P1-onboarding-2** (service-area edit nav: router.back vs onboarding→banking + hydrate zip/radius)
- **H4-postjob-2** (lock the matched provider in the booking match step when it came from a quote)
- **P6-1 / P6-2** (cold-start "0.0 trust" honesty — gate on the same threshold the match card already uses)
- Durable **server-side completion_ledger guarantee** for both check-ins (the proper deeper fix for P2-today-2 / H7-jobs-1)

### Remaining HIGH (more involved — multi-file / data-model; recommend a fresh budget window):
- **H4-postjob-1** — thread accepted-quote amount through booking (bookingStore + payment + postings).
- **P2-today-1 / P5-earnings-1** — carry `booking_type`/`application_fee_cents` to client for correct one-off net (17.5%) vs the hardcoded 10%.
- **H5-subs-1** — change-frequency recompute of monthly estimate + next_date (best as a server-side trigger).
- **P1-onboarding-2** — branch service-area edit nav (router.back vs onboarding→banking) + hydrate zip/radius.

---


Live-validated on sim: app boots (blue brand ✅), password sign-in ✅, home dashboard ✅, sacred booking wizard steps 1–2 ✅ (single-provider routing + honest 'New to MyHomebase' cold-start in match card — non-negotiables intact).

## CRITICAL (1)

### P1-provider-onboarding-1 — "Edit profile" reuses the onboarding profile step, which loads a BLANK form and overwrites the provider's saved bio/pricing/photos/avatar on Finish
- **kind:** data-integrity  |  **file:** `app/(provider)/onboarding/profile.tsx:29-34, 97-139`
- **fix:** Add an edit-mode that hydrates avatar/bio/prices/portfolio from the current providers row, and in onFinish only PATCH fields the user actually changed (never null/zero absent fields). Or build a dedicated edit screen separate from the first-run wizard step.

## HIGH (9)

### H1-auth-1 — Deferred / retry flush of pending homeowner setup is a silent no-op (user is null when flush runs)
- **kind:** data-integrity  |  **file:** `stores/authStore.ts:142, 154, 327-328, 403-408`
- **fix:** Pass the authenticated id into the flush (flushPendingHomeownerSetup(session.user.id)) or set user/session in the store BEFORE calling flush in applySession, so the flush reads the live user deterministically.

### H4-postjob-1 — Accepted custom-quote amount is discarded; booking charges the provider's generic price range instead
- **kind:** data-integrity  |  **file:** `app/(homeowner)/booking/payment.tsx, app/(homeowner)/postings/[id].tsx:payment.tsx:111-114,131-132; [id].tsx:89-97`
- **fix:** Add quoteAmountCents (and quoteId/postingId) to bookingStore, set them in onSchedule from the accepted quote, and have payment.tsx prefer the quoted amount over the price-range average when present; link the booking to the source quote/posting.

### H4-postjob-2 — Matched provider is lost in the scheduling handoff when they aren't in the zip/service shortlist
- **kind:** logic  |  **file:** `app/(homeowner)/booking/match.tsx, app/(homeowner)/postings/[id].tsx:match.tsx:51-63,112-117; [id].tsx:89-97`
- **fix:** When matchedProviderId originates from an accepted posting quote, fetch that provider directly and seed/lock the selection (or skip re-match entirely into details/payment) rather than relying on them appearing in the generic zip search.

### H5-subs-1 — Change-frequency persists only `frequency`, never the recalculated monthly estimate (or next_date)
- **kind:** data-integrity  |  **file:** `lib/api/subscriptions.ts:105-111`
- **fix:** In changeFrequency() also persist the recomputed monthly_estimate_cents and recompute next_date for the new cadence (server-side trigger or edge fn ideally) so the sheet preview and the stored value cannot diverge.

### P1-provider-onboarding-2 — Editing Service Area from the profile tab dumps the provider back into the linear onboarding wizard (banking → blank profile)
- **kind:** ux  |  **file:** `app/(provider)/onboarding/service-area.tsx:147`
- **fix:** Branch post-save navigation: when launched as a standalone edit (authProviderId set / onboarding complete, detected via route param), router.back() to the profile tab instead of pushing to banking. Also hydrate zip/radius from the saved providers row so the edit screen reflects reality.

### P2-today-1 — Provider net payout overstated for one-off jobs: hardcoded 0.9 fee ignores the 17.5% one-off platform fee
- **kind:** data-integrity  |  **file:** `lib/api/completions.ts; app/(provider)/(tabs)/today.tsx:completions.ts:23; today.tsx:75-77,347,721`
- **fix:** Carry booking_type and/or application_fee_cents through to the client (jobs select + completion_ledger select) and compute net = amount_cents - application_fee_cents, or return precomputed net_cents from the API. Remove the hardcoded *0.9 in completions.ts:23 and today.tsx:77,347.

### P2-today-2 — Check-in reports success even when payment capture / completion_ledger write silently fails
- **kind:** data-integrity  |  **file:** `components/checkin/ProviderCheckIn.tsx:146-151`
- **fix:** Await captureOnCompletion as part of the completion path and treat its failure as a check-in failure (or enqueue a guaranteed retry). At minimum, do not advance to PayoutSuccess / 'payout will process today' unless capture (ledger write) succeeded.

### P3-jobs-1 — Booked job requests get a fabricated 5-minute expiry that hides Accept/Decline
- **kind:** logic  |  **file:** `app/(provider)/(tabs)/jobs.tsx:151, 763-772, 877`
- **fix:** Remove the synthesized expiry for booked requests (a booking awaiting confirmation does not time out), or drive it from a real DB column. Never gate Accept/Decline on the fake countdown.

### P4-provider-schedule-1 — Sunday jobs are silently dropped from the week agenda (upper query bound is Sunday 00:00, not end-of-Sunday)
- **kind:** data-integrity  |  **file:** `app/(provider)/(tabs)/schedule.tsx:52, 78-87`
- **fix:** Make the upper bound inclusive of Sunday: query to addDays(weekStart,7).toISOString() with .lt('scheduled_at', nextMonday), or use endOfDay(addDays(weekStart,6)).

## MEDIUM (24)

### H1-auth-2 — Address setup is hard-blocked when geocoder returns nothing — no manual street entry fallback
- **kind:** ux  |  **file:** `app/(auth)/address-setup.tsx:39, 41-42, 76-86, 162`
- **fix:** Make street a real editable field and geocode-on-submit as a fallback (or allow Continue without coords and resolve lat/lng later) so a failed/empty geocoder cannot block onboarding.

### H2-hero-1 — Maintenance reminder fires for a service that is already booked, and its card hides the upcoming-booking card
- **kind:** logic  |  **file:** `components/home/AdaptiveHero.tsx:475-491`
- **fix:** Pass active/upcoming job serviceTypes into computeReminders (or into AdaptiveHero) and suppress/down-rank any reminder whose serviceType already has an active booking, so a NextBookingCard is shown for that service instead of a re-book nag.

### H2-hero-2 — dismiss_count back-off rule not enforced — reminders keep returning after repeated snoozes
- **kind:** logic  |  **file:** `lib/home/reminders.ts:74-80`
- **fix:** In isSuppressed, also return true when (st.dismissCount ?? 0) >= 2.

### H3-booking-1 — Payment retry creates duplicate bookings (no idempotency)
- **kind:** data-integrity  |  **file:** `app/(homeowner)/booking/payment.tsx:119-141`
- **fix:** Generate a clientRequestId once per wizard session and pass it to booking-create for an upsert, or store booking.id in state after first success so a retry only re-runs createIntent.

### H4-postjob-3 — acceptQuote is non-atomic and ignores errors on the quote-status updates
- **kind:** data-integrity  |  **file:** `lib/api/postings.ts:196-212`
- **fix:** Move the three writes into a single SECURITY DEFINER Postgres RPC executed transactionally, and check error on every client-side statement.

### H4-postjob-4 — Matched posting never transitions to 'completed'; 'Schedule this job' stays live, allowing repeat bookings
- **kind:** logic  |  **file:** `app/(homeowner)/postings/[id].tsx, lib/api/postings.ts:[id].tsx:302-334; postings.ts:196-229`
- **fix:** Link the created booking to its source posting and transition the posting to 'completed' (or disable/replace the CTA) once a booking exists for it.

### H5-subs-2 — Resume never recomputes next_date — paused-past-next_date subscription resumes showing a stale/past date
- **kind:** logic  |  **file:** `lib/api/subscriptions.ts:85-91`
- **fix:** On resume, advance next_date forward from today per the frequency (server-side trigger or edge fn).

### H5-subs-3 — getPriceFloors() filters on non-existent `is_active` column — query errors and silently returns no floors
- **kind:** logic  |  **file:** `lib/api/providers.ts:263-282`
- **fix:** Remove `.eq('is_active', true)` or replace with a real predicate (e.g. valid_to is null / onboarding_completed_at is not null); log the error instead of swallowing it.

### H6-claims-1 — Claim evidence photos render as broken images (raw private-bucket storage paths used as Image URIs)
- **kind:** logic  |  **file:** `app/(homeowner)/claims/photos.tsx:57, review.tsx:176-182, [id].tsx:310-316`
- **fix:** Generate a signed URL via getSignedUrl('claim-photos', path) when rendering, or display localUri in review and resolve display URLs from path on the detail screen. Never pass a bare storage path to Image uri.

### H6-claims-2 — Removing an uploaded photo while another is still uploading strands the upload and soft-locks the step
- **kind:** logic  |  **file:** `app/(homeowner)/claims/photos.tsx:46-62, 64-67, 142-167`
- **fix:** Key slots by a stable id when applying upload results, and/or disable the remove buttons while anyUploading is true.

### H6-claims-3 — Claim draft is not reset when the wizard is (re)entered, leaking data across different jobs
- **kind:** data-integrity  |  **file:** `stores/claimStore.ts:claimStore.ts:81/85, _layout.tsx:43-46, incident.tsx:128-132`
- **fix:** Reset the draft on fresh entry — e.g. resetDraft when setJobContext receives a jobId different from draft.jobId, or on mount of the incident step when no in-progress draft is intended.

### H7-jobs-1 — completion_ledger / payment capture is fire-and-forget; a failed capture is silently swallowed while the homeowner is shown a success screen
- **kind:** data-integrity  |  **file:** `components/checkin/HomeownerCheckIn.tsx:108-113`
- **fix:** Either enqueue a durable retry for capture or guarantee the completion_ledger write server-side inside the provider-checkin/homeowner-checkin edge function transactionally, rather than relying on best-effort client calls; at minimum surface a non-fatal retry path.

### P3-jobs-2 — Request card shows GROSS amount as payout while Active/Completed show NET (90%)
- **kind:** logic  |  **file:** `app/(provider)/(tabs)/jobs.tsx:150, 384, 521, 837`
- **fix:** Apply the same *0.9 net calculation in the requests mapper (or centralize one payout helper) so the request card matches Active/Completed.

### P3-jobs-3 — Decline removes the request optimistically with no rollback on failure
- **kind:** logic  |  **file:** `app/(provider)/(tabs)/jobs.tsx:349-357`
- **fix:** Restore the item in the catch (or remove only after the await succeeds), and invalidate/refetch the 'job-requests' query rather than the jobs query.

### P4-provider-schedule-2 — BlockTimeSheet pre-fills the previously selected date, not the day the provider tapped (stale-by-one-render via useImperativeHandle)
- **kind:** logic  |  **file:** `app/(provider)/(tabs)/schedule.tsx:66-69 + components/provider/BlockTimeSheet.tsx:81-97`
- **fix:** Pass the date into present(date) and set internal state from the argument, or read prefilledDate from a ref updated synchronously, rather than relying on the prop closure that lags one render.

### P5-earnings-1 — Earnings history hardcodes 10% take rate, overstating net for one-off jobs and contradicting the available balance
- **kind:** data-integrity  |  **file:** `app/(provider)/(tabs)/earnings.tsx:137`
- **fix:** Persist application_fee_cents (or net_cents / booking_type) on completion_ledger at capture and derive net = amount_cents - application_fee_cents here instead of the flat *0.9, so per-row net reconciles with the available balance for one-offs.

### P5-earnings-2 — Cash-out button stays permanently disabled (Payout initiated) after one successful payout in the same session
- **kind:** logic  |  **file:** `app/(provider)/(tabs)/earnings.tsx:331-352`
- **fix:** Drop payoutDone from the disabled/label conditions (balanceIsZero already covers the just-paid-out zero balance), or call mutation reset() when a non-zero balance is refetched.

### P6-provider-profile-crew-1 — Cold-start provider profile shows fake "0.0 composite trust" hero alongside honest "New to MyHomebase" card
- **kind:** logic  |  **file:** `app/(provider)/(tabs)/profile.tsx:283-288, 641-666`
- **fix:** Gate the hero composite-trust block on the same honest threshold TrustSummary uses (checkInCount >= RATING_MIN_REVIEWS && (providerData.compositeScore.overall ?? 0) > 0) instead of `overallTrust != null`, so cold-start providers see only the 'New to MyHomebase' state.

### P7-customjob-2 — getPriceFloors filters on non-existent providers.is_active column — price floors silently always empty
- **kind:** logic  |  **file:** `lib/api/providers.ts:263-282`
- **fix:** Remove the .eq('is_active', true) clause (or replace with the real availability column the providers table actually has — confirm against live schema first). is_active does not exist.

### P7-customjob-3 — No posting-status guard on quote submission — provider can quote on matched/expired postings
- **kind:** logic  |  **file:** `app/(provider)/posting/[id].tsx:38-53`
- **fix:** Gate the form/submit on posting.status === 'open' (disable button + show 'This request is no longer open'), and enforce server-side via an RLS WITH CHECK or trigger rejecting inserts when the posting status <> 'open'.

### X1-messaging-1 — Reopening a cached thread opens scrolled to the TOP (oldest messages), not the bottom
- **kind:** ux  |  **file:** `app/(homeowner)/thread/[id].tsx:196, 205-220`
- **fix:** Drive the initial scroll off a one-time didInitialScroll ref or FlatList onContentSizeChange so it fires whenever the list first has content, independent of cached message count.

### X1-messaging-2 — Messages received while the thread is open are never marked read (unread count stays inflated)
- **kind:** data-integrity  |  **file:** `lib/messaging/useThreadMessages.ts:79-92, 95-113`
- **fix:** In the realtime onMessage handler, when incoming.fromUserId !== currentUserId, call markRead(jobId) (debounced); or move markRead out of the capture-once effect so it re-runs as new unread messages arrive while mounted.

### X2-notifications-1 — Provider unread-badge query key (providerId) never matches NotificationCenter invalidation key (auth userId), so the bell badge stays stale after the provider reads notifications
- **kind:** logic  |  **file:** `app/(provider)/(tabs)/today.tsx:311-317`
- **fix:** Key the provider badge query on the auth user id (useAuthStore(s=>s.user)?.id) instead of providerId, matching NotificationCenter's invalidate() and unreadCount()'s RLS scope.

### X3-shared-1 — Push-notification deep-link is broken for tech role
- **kind:** logic  |  **file:** `app/_layout.tsx:94-98`
- **fix:** Branch the deep-link on all three roles; route provider_tech to a screen that exists (e.g. /(tech)/(tabs)/today, or add a tech notification center).

## LOW (31)

### H1-auth-3 — Re-signup of an already-confirmed email can strand the user on verify-email when resend is rate-limited
- **kind:** logic  |  **file:** `stores/authStore.ts:267-279`
- **fix:** On a zero-identities existing-email signup, treat a rate-limit resend error as 'already registered -> sign in' (or add an 'already registered' escape on the verify screen) instead of falling through to verify.

### H1-auth-4 — Home detail 'Total invested' stat uses the notification Bell icon instead of a money icon
- **kind:** ux  |  **file:** `app/(homeowner)/home-detail.tsx:103`
- **fix:** Import and use a currency/wallet icon (DollarSign or Wallet from lucide-react-native) for the spend StatCard.

### H2-hero-3 — Seasonal 'recommended' reminder preempts the setup/activation nudge for new users
- **kind:** logic  |  **file:** `components/home/AdaptiveHero.tsx:483-496`
- **fix:** Only let overdue/due_soon reminders (status !== 'recommended') win the hero over the nudge; route 'recommended' seasonal items to the reminders list / Book tab so state 5 (setup nudge) can activate new users.

### H2-hero-5 — Hero skeleton guard ignores completions/serviceStatuses loading → brief wrong-card flash on cold boot
- **kind:** ux  |  **file:** `app/(homeowner)/(tabs)/index.tsx:372-385`
- **fix:** Include the completions/serviceStatuses loading state in the skeleton guard (capture their isLoading and gate the hero on all hero-feeding queries) so the hero renders once with the final card.

### H3-booking-2 — Property-photo capture control is a non-functional stub
- **kind:** dead-code  |  **file:** `app/(homeowner)/booking/details.tsx:140-164`
- **fix:** Wire the Pressable to expo-image-picker (downstream setPhoto/photoUrl plumbing already exists) or hide the control until implemented.

### H3-booking-3 — 'Save instructions for future bookings' toggle has no effect
- **kind:** ux  |  **file:** `app/(homeowner)/booking/details.tsx:24, 168-195`
- **fix:** Persist the preference + instructions (e.g. to homeowner profile) or remove the toggle until built.

### H3-booking-4 — Auto-scroll to booking-type section is a no-op on first service selection
- **kind:** logic  |  **file:** `app/(homeowner)/booking/service-select.tsx:119-126`
- **fix:** Use scrollViewRef.scrollToEnd, or read the layout y from a ref populated by onLayout instead of a state value captured before the section mounts.

### H3-booking-5 — Match-step timeout Retry cannot recover an address-query stall
- **kind:** logic  |  **file:** `app/(homeowner)/booking/match.tsx:66-77, 199-202`
- **fix:** In the timeout Retry, also refetch the address query (or invalidate both query keys).

### H5-subs-4 — Avatar initials use providerName[0].toUpperCase() unguarded — crashes on empty-string display_name
- **kind:** crash  |  **file:** `app/(homeowner)/subscriptions/index.tsx:88`
- **fix:** Use (sub.providerName.trim()[0] ?? '?').toUpperCase(), or coerce empty strings to 'Provider' in the mapper.

### H5-subs-5 — Frequency 'Change' control remains active on cancelled subscriptions
- **kind:** ux  |  **file:** `app/(homeowner)/subscriptions/[id].tsx:441-472`
- **fix:** Gate the 'Change' affordance (and sheet) behind sub.status !== 'cancelled', rendering frequency as static text otherwise.

### H7-jobs-2 — No 'already reviewed' guard — homeowner can re-open and re-submit the check-in/review repeatedly within the 48h window
- **kind:** logic  |  **file:** `app/(homeowner)/job/[id].tsx:105, 240-242`
- **fix:** After a review is submitted, hide/disable the 'Submit check-in' control by reading a per-job review-submitted flag, and ensure the edge function is idempotent per (job, homeowner).

### P1-provider-onboarding-3 — Verification (Tier 1 / Tier 2) is absent from the onboarding wizard; providers go active with verification_tier 0
- **kind:** logic  |  **file:** `app/(provider)/onboarding/verification-tier1.tsx:147`
- **fix:** Either insert the Tier 1 step into the wizard (or add a prominent post-onboarding nudge) or soften the 'requires a background check on every provider' copy so it doesn't contradict a flow that completes without it. Pick one and make them consistent.

### P1-provider-onboarding-4 — Dead onboarding/availability.tsx still calls onboard() without the duplicate-provider guard
- **kind:** dead-code  |  **file:** `app/(provider)/onboarding/availability.tsx:196-212`
- **fix:** Delete onboarding/availability.tsx and, if unused elsewhere, the saveAvailability write path, to prevent accidental re-wiring.

### P2-today-3 — KPI strip can stay stale after check-in close due to invalidation racing the un-awaited ledger write
- **kind:** logic  |  **file:** `app/(provider)/(tabs)/today.tsx; components/checkin/ProviderCheckIn.tsx:today.tsx:403-408; ProviderCheckIn.tsx:146,150,368,611`
- **fix:** Await the capture before advancing to PayoutSuccess, or invalidate/refetch the today-ledger after the capture promise resolves rather than on modal close.

### P3-jobs-4 — Job assigned to a removed/inactive tech renders as 'Assign tech' (unassigned)
- **kind:** logic  |  **file:** `app/(provider)/(tabs)/jobs.tsx:221-223, 250-255`
- **fix:** Resolve the assigned name from the full crew list (or job-embedded profile), and optionally mark inactive techs, rather than only the active-tech subset.

### P3-jobs-5 — Status pill 'as of' line reads 'as of in 3 hours' for future-scheduled jobs
- **kind:** ux  |  **file:** `app/(provider)/(tabs)/jobs.tsx:31-32, 77, 421-424`
- **fix:** Use a status-change timestamp (timestamps.confirmed_at / updated_at) for the 'as of' line, or drop it for future-dated schedules.

### P3-jobs-6 — Provider 'Job requests' screen claims geo proximity but filters only by service type
- **kind:** ux  |  **file:** `lib/api/postings.ts:120-137`
- **fix:** Add a service-area/zip filter to listOpenForProvider, or soften the header copy until geo filtering exists.

### P4-provider-schedule-3 — AvailabilitySheet saves working hours with no start<end validation (inverted/zero-length hours accepted)
- **kind:** logic  |  **file:** `components/provider/AvailabilitySheet.tsx:303-311, 92-99`
- **fix:** Before saveMutation.mutate(), validate dateToHMS(endTime) > dateToHMS(startTime) and surface an inline 'End must be after start' error, mirroring BlockTimeSheet.

### P4-provider-schedule-4 — 'Blocked times' upcoming list is bounded by the navigated week window, so future blocks beyond ~5 weeks or before the viewed week disappear
- **kind:** logic  |  **file:** `app/(provider)/(tabs)/schedule.tsx:90-91 + components/provider/BlockedTimesPanel.tsx:34-37`
- **fix:** Fetch the upcoming-blocks list with a window anchored to today (today .. today+90d) independent of weekStart, and broaden the filter to include blocks with end_at >= from so ongoing/multi-day blocks aren't dropped.

### P5-earnings-3 — Instant-payout sheet shows a negative You receive and allows payout when balance is below the $0.50 minimum fee
- **kind:** logic  |  **file:** `app/(provider)/(tabs)/earnings.tsx:163-164, 221, 681`
- **fix:** Gate Cash out on balanceCents > payoutFee and clamp youReceive so a sub-fee balance cannot be cashed out; have the backend reject amount <= fee as well.

### P5-earnings-4 — Balance shimmer animates unconditionally, including at $0.00 balance
- **kind:** ux  |  **file:** `app/(provider)/(tabs)/earnings.tsx:106-108, 312-314`
- **fix:** Gate the withRepeat start on balanceCents > 0 and reset opacity to 1 otherwise.

### P6-provider-profile-crew-2 — "Your numbers" trust-score tile renders 0.0 for new providers; the '—' fallback is effectively dead for any provider with a row
- **kind:** logic  |  **file:** `app/(provider)/(tabs)/profile.tsx:116, 283-288, 300`
- **fix:** Compute overallTrust as null (yielding '—') when checkInCount is below RATING_MIN_REVIEWS or compositeScore.overall is 0, instead of a 0-based weighted sum.

### P6-provider-profile-crew-3 — Crew roster today-job-count badge never renders (data never populated)
- **kind:** dead-code  |  **file:** `app/(provider)/crew/index.tsx:229-255`
- **fix:** Populate todayJobCount in listForProvider (count today's jobs by assigned_tech_id) or remove the unused badge UI.

### P7-customjob-4 — "Quote sent" badge / edit state ignore quote status (declined/withdrawn treated as active)
- **kind:** logic  |  **file:** `app/(provider)/posting/[id].tsx:32`
- **fix:** Filter listMyQuotes consumers to status === 'sent' (or 'sent'/'accepted') when computing quotedIds and the editable `existing` quote, so declined/withdrawn quotes don't masquerade as live.

### P7-customjob-5 — Non-numeric price input produces NaN amount_cents (silently dropped to null)
- **kind:** data-integrity  |  **file:** `app/(provider)/posting/[id].tsx:42`
- **fix:** const parsed = parseFloat(amount); const cents = amount.trim() && Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : null; optionally show an inline error for invalid input.

### X1-messaging-3 — Inbox lists never subscribe to realtime; unread counts and previews stay stale
- **kind:** missing-hook  |  **file:** `app/(homeowner)/(tabs)/inbox.tsx:414-428`
- **fix:** Subscribe the inbox list to message inserts for the user's job set and invalidate ['threads', role, id] on arrival, or add a modest refetchInterval / refetchOnWindowFocus for the threads query. Ignore the provider 'no tab badge' sub-claim.

### X2-notifications-2 — Provider notification deep-link resolver only handles threadId, so provider-targeted notifications (booking_matched, payout_sent, claim_update, verification_approved) dead-end with no navigation
- **kind:** ux  |  **file:** `app/(provider)/notifications.tsx:5-9`
- **fix:** Extend provider resolveHref to map booking/job/claim payload ids to their routes (e.g. requests/scheduling for booking_matched/confirmed, claims for claim_update), after confirming the actual data key names against the send-push-notification edge function.

### X2-notifications-3 — Homeowner notification deep-link resolver ignores threadId though a homeowner thread route exists and threadId is the established new_message convention
- **kind:** ux  |  **file:** `app/(homeowner)/notifications.tsx:5-11`
- **fix:** Add a threadId branch to homeowner resolveHref returning /(homeowner)/thread/${threadId}, consistent with the provider resolver and the existing route.

### X3-shared-2 — Tech Earnings displays full gross job amount as the tech's earnings
- **kind:** ux  |  **file:** `app/(tech)/(tabs)/earnings.tsx:32-37,163`
- **fix:** Relabel the figures as 'job value' rather than the tech's earnings, or surface the tech's actual wage/payout if/when that data exists.

### X3-shared-3 — Tech Earnings today/week windows filter by scheduled date, not completion date
- **kind:** logic  |  **file:** `app/(tech)/(tabs)/earnings.tsx:23-37`
- **fix:** Window and sort by job.timestamps.completed instead of scheduledAt (note the key is `completed`, not `completed_at`).

### X3-shared-4 — Boot safety-net marks user authenticated with a null session/user
- **kind:** logic  |  **file:** `stores/authStore.ts:191-195`
- **fix:** In the timeout, only flip to 'authenticated' when a real session/user is present; otherwise resolve to 'unauthenticated' so a role'd user can re-auth instead of landing on a dead dashboard.

## DYNAMIC (sim-only finds)

### DYN-1 — Book-tab "Search services" field is a secureTextEntry (password) field
- **kind:** ux  |  **file:** `app/(homeowner)/(tabs)/book.tsx:(search input)`
- **expected:** Service search is a normal text field with autocorrect/suggestions.
- **actual:** Accessibility subrole is AXSecureTextField — the input is rendered with secureTextEntry, so text is masked and iOS offers password autofill. The Home-tab search field is a normal field; only the Book-tab one is secure.
- **trigger:** Book tab → tap "Search services" and type.
- **fix:** Remove secureTextEntry from the Book-tab service search TextInput.

## Uncertain (needs product call, not bugs)
- H2-hero-4 — Hero has no 'action required' state (quotes/proposed-time/check-in never surface in hero). Likely deferred feature.
- H3-booking-6 — Step-1 estimated price can diverge from amount charged. Depends on intended pricing model.
