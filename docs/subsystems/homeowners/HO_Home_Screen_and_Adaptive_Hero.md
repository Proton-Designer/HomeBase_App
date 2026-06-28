# Homeowner Home Screen + Adaptive Hero — Spec

**Purpose:** The optimized homeowner home screen, and a buildable spec for the Adaptive Hero (the most important slot on it). Reflects all current product decisions. For reference by the implementing agent.

---

## Guiding principles (govern every change to this screen)

1. **The home screen answers one question instantly:** *"What about my home needs my attention right now, and what's the one tap to handle it?"* Everything that serves that earns its slot; everything else moves to the Book tab.
2. **The home screen recommends; the Book tab merchandises.** No services catalog/grid on the home screen.
3. **Restraint is the product.** We are the calm, "handled" app — not the cluttered marketplace app. Resist pressure to add revenue surface (banners, upsell shelves, catalogs).
4. **Helpful beats salesy — and converts better.** Trust is what makes a homeowner book a stranger for their home.

---

## Optimized home screen — element order (top to bottom)

1. **Header** — time-based greeting + first name; notification **bell with unread badge** (bell is the in-app home for push-driven reminders).
2. **Search / intent bar** — "What needs doing around the house?" Feeds `demand_events`; off-catalog queries route to a custom job post. Keep prominent.
3. **My Home card** — property image + address + three counts (Completed / Upcoming / **Reminders**). Make the **Reminders count tappable** into the reminders list (this is where the deleted maintenance section's content now lives). Reads as a status, not decoration.
4. **Adaptive Hero** — the single most important slot. One context-aware card (full spec below).
5. **Your Pros** — one-tap rehire of previously-used providers. High value: highest-converting, most retention-positive action, and the key anti-leakage surface.
6. **Bottom tabs** — Home / Book / Jobs / Inbox / Profile.

**Deleted / resisted:** the standing Maintenance Reminders section (reminders are episodic → they belong in push + bell + the My Home count, not a permanent block); Home Health Score / gamification (gimmicky without real signals); services catalog on home (belongs in Book tab); permanent promo/referral banners (one contextual referral hook after a great job is fine).

---

## The Adaptive Hero

**What it is:** not a fixed card — a **priority-ranked slot** that surfaces the single thing that matters most to this homeowner at this exact moment, with one obvious action. The skill is the priority order.

**How it works:** evaluate states top-to-bottom; **show the first state that is true. Exactly one card renders, ever.**

### Priority ladder (highest first)

**1. Live job in progress** *(beats everything — time-sensitive, anxiety-relevant)*
- When: a job is en route / arrived / in progress right now.
- Contents: pro name + photo + trust score; live status ("Marcus is on the way · ETA 12 min"); map/progress indicator; one-tap **Message** + **Call**.
- On completion → flips to the check-in prompt (state 2).

**2. Action required from the homeowner** *(blocking — they are the bottleneck)*
- When: quotes returned and need a choice; a pro proposed a time to confirm; a **pending 15-second check-in** after a finished job; a payment issue.
- Contents: the specific ask + one-tap resolution — "3 pros sent quotes — compare & choose," "Confirm Thursday 9am," "Rate your lawn service — 15 sec."
- Note: the check-in is BOTH an action-required state and the sacred data-capture moment — surface it here, not buried in notifications.

**3. Maintenance due — confirm-loop** *(the demand engine; only when GENUINELY due)*
- When: nothing live/blocking, but a service is genuinely due per real cadence logic (NOT seasonal filler).
- Contents: service + *why* ("last done 18 days ago") + confirm-loop actions:
  - **Book it / Set it to recur** (primary; default toward recurring — honest AND high-value)
  - **Already handled** (records a self-reported service dated today → cadence resets → goes quiet; ask "by a HomeBase pro / someone else?")
  - **Remind me later** (snooze / down-weight)
- Humble framing: "Lawn looks about due — handled?" — never "your lawn is overdue."
- Strategic notes: the "Already handled — by someone else" tap is a **supply-discovery + moat signal** (off-platform demand surfaced). Follow up with "want us to bring your pro onto HomeBase?" to feed the supply-led-demand GTM.

**4. Next scheduled booking** *(reassurance, not urgency)*
- When: nothing live/blocking/due, but an upcoming job exists.
- Contents: service, date/time, pro + trust score, **View details** + subtle manage/reschedule link. The "your home is handled" state.

**5. Setup nudge** *(new user — activation)*
- When: brand-new homeowner, no history, nothing scheduled.
- Contents: "Book your first service and we'll start handling your home." One clear CTA into booking. Critical for activation — never an empty hero.

**6. All caught up** *(true-empty calm fallback)*
- When: returning user, nothing live/due/scheduled.
- Contents: "Your home's all caught up — book whenever you're ready," with a soft **rehire** suggestion ("or rebook Marcus for lawn"). A calm home screen is a feature, not a gap.

### Design rules (more important than the list)

- **Exactly one card shows. Ever.** The priority ladder exists so two never compete.
- **One primary action per card.** Secondary actions are smaller/de-emphasized. The hero recommends, never presents a menu.
- **Rank by urgency-TO-THE-HOMEOWNER, not by revenue.** A live job or pending check-in ALWAYS outranks a maintenance/booking prompt. Getting this order wrong is the one way the hero feels salesy instead of helpful.
- **It should feel like the app is thinking about the home** — every state, even the calm one, reads as "I know what's going on at your house," not "here's an offer."
- **Keep the ladder short and the order non-negotiable.** Don't expand into a dozen fuzzy states; the six above cover nearly every real situation, and the homeowner-urgency principle breaks any tie.

### Ladder summary (memorize this order)
**Live job → Action required (incl. check-in) → Maintenance due (confirm-loop) → Next booking → Setup nudge → All caught up (with rehire).** First true state wins; one card; one action.

---

## Supporting data the hero reads

- Live/active job state (jobs table, realtime subscription) — states 1, 2.
- Pending quotes / proposed times / pending check-in — state 2.
- Per-home, per-service maintenance status (see below) — state 3.
- Upcoming bookings — state 4.
- Completion/booking history (empty → state 5; present → states 4/6).

**Maintenance status model (don't pollute `completion_ledger`):**
`home_service_status(homeowner_id, service_type, last_serviced_at, last_source: platform|self|external, cadence_days_override, state: active|self_managed|not_applicable, snoozed_until, dismiss_count)`
- `last_serviced = max(platform, self_report, onboarding_seed)`; cadence = override else default.
- Don't-nag rules: only surface with a real signal or opted-in interest; one nudge per cycle then back off; `dismiss_count >= 2` or `self_managed`/`not_applicable` → stop showing.

---

## Strategic framing (so this isn't under-prioritized)

Deleting the maintenance section is NOT a cleanup — it moves the **demand engine from a passive home-screen shelf to an active push channel**. Push reaches the homeowner when they're NOT in the app and manufactures a booking moment; an in-app section only converts someone already there. Invest accordingly: get the push notifications + confirm-loop RIGHT (it's the engine); keep the home-screen layout simple (it's just tidy). The confirm-loop also feeds the data flywheel and surfaces off-platform supply to recruit.
