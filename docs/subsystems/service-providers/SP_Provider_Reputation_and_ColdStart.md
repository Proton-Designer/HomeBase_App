# Provider Reputation System + New-Provider Cold-Start — Spec

**Purpose:** The finalized model for provider reputation at onboarding, and how a brand-new provider with zero MyHomeBase history starts. Outcome of an extended design discussion. For reference by the implementing agent.

---

## Core principle

**Do NOT run two parallel review systems. Run one (native, yours), and show external reputation as a credential — not a competing rating.**

- **External reputation = a badge for legitimacy** ("is this a real, experienced business?")
- **Native reviews (from MyHomeBase check-ins) = the thing people actually read** ("how good is their work?")

One-line summary: *The badge tells you they're a real, experienced business; the MyHomeBase score tells you how good they actually are — and only the second one grows.*

---

## The reputation model (decisions)

1. **External reviews NEVER feed the MyHomeBase trust score.** The computed score is built ONLY from verified MyHomeBase check-ins. This protects the integrity of the verified-trust differentiator — the moat. Unverified external ratings never touch the native score.

2. **External reputation shows as a badge only** — a verified aggregate, e.g. "Established business · 8 yrs · 4.8★ on Google." Presented as proof of legitimacy/experience, shown separately and clearly labeled as external. It answers "is this legit?", not "how good is their work?"

3. **Do NOT display individual external reviews.** Google's API returns only 5 reviews IT chooses (no curation possible), and 5 algorithm-picked reviews are a weak, uncontrollable signal. A business has good AND bad reviews — you can't cherry-pick, and shouldn't. Show the honest aggregate number (which already reflects the mix) as a badge; skip review text entirely.

4. **Never link out to Google (or any external site).** Leakage risk: an outbound link lets the homeowner contact the provider off-platform and lose the booking. Everything stays in-app — keep the read AND the booking inside the app.

5. **Native reviews are the read-before-booking signal**, generated automatically as a byproduct of completed jobs (no homeowner data-entry friction — the failure mode that kills standalone home apps). New MyHomeBase jobs always feed MyHomeBase, never Google.

6. **The external badge is a one-time, decaying credential.** It carries trust on day one for an established-but-new-to-MyHomeBase provider, then naturally recedes as the provider's own verified score fills in over their first several jobs. It fades BY DESIGN — no extra decay logic needed, because the growing native score simply takes over.

7. **Honest "reviews building" state** for new providers — the profile plainly says "New to MyHomeBase — reviews appear here as jobs complete," paired with the badge + verification, rather than faking history.

---

## How a brand-new provider starts (cold-start)

A provider joins with zero MyHomeBase jobs → no native score, no native reviews. What a homeowner sees instead of a trust score, in priority of trust-weight:

1. **Verification badges** — background-checked (Tier 1) + insured (Tier 2). Earnable immediately at onboarding; genuinely meaningful. This is the FLOOR — it's what lets a new provider clear the shortlist's quality bar at all.

2. **External reputation badge** (if an established business) — "Established · X yrs · verified on Google." On day one this carries almost all the trust load, precisely because the native score is empty; it recedes as native jobs accumulate.

3. **Real work samples / portfolio photos** — the most underrated signal. For an unproven provider, photos of actual completed jobs let a homeowner judge quality directly, with no score needed. Carries significant cold-start weight.

4. **Honest "New to MyHomeBase" label + intro pricing** — don't fake a score or bury them. A newcomer competes on the axes they CAN control: verification, real work photos, availability, competitive intro rate.

**What a homeowner sees for a brand-new provider:** verification + external badge (if any) + work photos + intro price + honest new-status — instead of a trust score. Enough for a rational homeowner to take the first chance, which earns the provider their first verified check-ins, which build the real score.

---

## Honest gap (named, not yet resolved)

The genuinely NEW business — not an established one switching over, but someone with no external/Google presence either — has neither a native score nor an external badge. Hardest case. Their only levers: verification, work photos, availability, intro price.

We concluded this is acceptable and fair (a brand-new business should earn its reputation; an established one deserves an edge). But the truly-new provider has a steeper climb.

**Open question to TEST, not assume:** is "verification + photos + intro price + honest new-status" enough to get a homeowner to book a completely unproven provider? Validate with real homeowners before relying on it.

---

## The structural solution: supply-led onboarding (ties to GTM)

The cleanest way a new provider gets first jobs is NOT profile design — it's **supply-led demand.**

- Onboard providers who ALREADY have their own recurring customers off-platform.
- Migrate the provider WITH their existing client book, so their "first MyHomeBase jobs" are their own loyal customers.
- Those homeowners aren't judging a thin profile — they already trust the provider — so there's no cold-start trust problem.
- This bootstraps the provider's verified score immediately and seeds verified-completion data.

This is the #1 cold-start unlock (also the top GTM motion). Profile signals (above) and supply-led onboarding are two halves of the same answer:
- **Profile signals** solve "what does a homeowner see for an unproven provider?"
- **Supply-led onboarding** solves "how does an unproven provider get their first jobs at all?"

---

## Where this already lives

The reputation-model half (decisions 1–7) is written into the provider subsystem doc under Subsystem 2 (Onboarding, Profile & Verification), the "External reputation & trust build-up" group, plus a scope-note bullet. This doc consolidates that PLUS the cold-start / supply-led answer.
