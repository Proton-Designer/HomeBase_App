# Messaging UI/UX Refactor — Design Spec

**Subsystem:** Job-scoped chat (inbox + thread)
**Scope:** Homeowner + Provider roles, mobile-first (web split-pane inherits)
**Status:** Design spec — read-only, no code changed
**Date:** 2026-06-24

---

## 1. Problem Statement

The current messaging UI has three overlapping failures:

1. **Visual:** Early-2010s flat list + plain bubbles. No grouping, no day separators, no delivery state beyond opacity, no job context in the header. Feels like a proof-of-concept, not a product.
2. **Contextual:** The thread header shows "Your provider" or "Homeowner" — zero anchoring to the actual job. A user with two plumbing jobs can't tell which conversation is which without reading message history.
3. **Functional gaps:** Typing state is invisible. Read receipts exist in the DB (`read_at`) but are never surfaced. Quick replies for the most common professional exchanges are missing. The unread divider is absent. Attachment stub is non-functional.

The chat is job-scoped and two-party — this is its distinguishing constraint. The design must feel like a professional communication tool for a service transaction, not a social messaging app. Calm, helpful, never salesy.

---

## 2. Approach Exploration + Red-Team

### Option A — Evolutionary Layer
Keep the bubble layout exactly as-is; layer on grouping, separators, delivery icons, typing dots, quick replies.

**Red-team:** Doesn't resolve the core job-context problem. The header still reads as a people-chat, not a job-chat. With 3 active jobs from two different providers, the user is still disoriented. Grouping and separators alone make it look 2018, not 2024.

### Option B — Job-First Thread (Chosen as primary)
Thread header becomes a persistent "Job Context Bar" with avatar, name, and job metadata below. The job is the organizing entity, the person is secondary. Static quick-reply chips appear only when the thread is new (fewer than 3 messages) and are curated by role + job state. All modern bubble improvements layered on top.

**Red-team:** Risk of header bloat on small screens. Mitigation: keep the context bar to 56px collapsed height, with job info as a single secondary line. The "View job" tap target is always available for more context.

### Option C — Minimal iMessage
Maximum whitespace reduction. Timestamps only on tap-and-hold (hidden by default). Zero job context in thread header.

**Red-team:** Wrong for a professional marketplace. Time-of-message matters for scheduling disputes. Users need anchoring to the job. Fails the "calm, helpful" brand promise by hiding useful information.

### Option D — Unified Activity Feed Inbox
Replace the flat thread list with an activity timeline: "Marcus (HVAC) said: I'll be there Tuesday." Each line is a job-scoped event card, not a thread row.

**Red-team:** Breaks the established mental model users have of a message inbox. Adds cognitive overhead. At 2–5 threads (MVP scale), offers no benefit over a structured list. Defers to Phase 4 as a potential "notifications" surface.

### Synthesis
**Option B + A layer.** Job context bar in the thread header (Option B) with all modern bubble mechanics from Option A. Option D elements (job metadata in inbox rows) absorbed into the inbox thread row design. Option C's restraint applied as a UI principle: no visual clutter for its own sake.

---

## 3. Inbox Screen — Full Spec

### 3.1 Screen Layout (top to bottom)

```
┌──────────────────────────────────────┐
│ [Safe area top]                       │
│ ─ Eyebrow: "INBOX"                   │
│ ─ Title: "Messages"  (editorial-title)│
│ ─ [Optional: search bar, Phase 2]    │
├──────────────────────────────────────┤
│ Thread rows (FlatList, no separator) │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ [Avatar 48] [Content]  [Time]  │  │
│  │             [Name+badge]       │  │
│  │             [Job context]      │  │
│  │             [Preview]          │  │
│  └────────────────────────────────┘  │
│                                      │
│  ... (more rows)                     │
├──────────────────────────────────────┤
│ [Bottom nav — safe area bottom]      │
└──────────────────────────────────────┘
```

### 3.2 Thread Row Component

**Layout:** `flexDirection: 'row'`, `paddingHorizontal: 20`, `paddingVertical: 14`, `gap: 12`

Rows are separated by 1px `colors.divider` bottom border (current) OR by `marginBottom: 1` gaps — keep current border approach for consistency.

**Avatar (left):**
- 48×48px circle, `borderRadius: 24`
- Fallback: initial letter in `primary[100]` bg, `primary[700]` text (PlusJakartaSans_700Bold, ~20px)
- No online presence ring at MVP (needs presence table — Phase 2)

**Content block (flex: 1, `gap: 2`):**
- **Row 1:** Name + unread badge
  - Name: `textStyles['title-md']`, `colors.textPrimary`, `numberOfLines: 1`
  - If `thread.unreadCount > 0`: name uses `Inter_700Bold` (not semibold)
- **Row 2: Job context line** (NEW — requires schema change, see §6)
  - `textStyles['body-sm']`, `colors.textTertiary`, `numberOfLines: 1`
  - Format: `{ServiceTypeIcon} {serviceType} · {jobStatusLabel}`
  - Example: "HVAC Tune-Up · Scheduled Jun 28" or "Lawn Care · In Progress"
  - Use `Pill` component for status chip only if `colors.surface` bg fits — otherwise plain text
  - If no job metadata yet (fallback): omit this row
- **Row 3: Preview line**
  - `textStyles['body-sm']`, `numberOfLines: 1`
  - If unread: `Inter_600SemiBold`, `colors.textPrimary`
  - If read: `Inter_400Regular`, `colors.textSecondary`
  - Prefix with `"You: "` (in `colors.textTertiary`) if last message was from current user
  - Prefix with `"{first name}: "` (in `colors.textTertiary`) if from other party in a group conversation (provider_tech scenario — edge case)
  - Truncate with `numberOfLines: 1`

**Right column (`gap: 4`, `alignItems: flex-end`):**
- Time: `textStyles['body-sm']`, `colors.textTertiary`
  - Today: "2:30 PM"
  - Yesterday: "Yesterday"
  - This week: "Mon", "Tue", etc.
  - Older: "Jun 18" (no year unless cross-year)
- Unread badge (if `unreadCount > 0`):
  - 20px height, `minWidth: 20`, `borderRadius: 10`
  - Background: `colors.primary[600]`
  - Text: `Inter_700Bold`, 11px, `colors.textInverse`
  - Content: count string (cap at "9+" after 9)
  - Currently: 10px dot — replace with the counted badge above

**Press behavior:**
- `usePress()` animatedStyle (existing pattern — keep)
- On press: navigate to thread screen
- `entering={enterStaggered(index)}` (existing — keep)

### 3.3 Loading State

Show 3 skeleton rows using `SkeletonLoader` (existing component). Each row mimics the real layout: circle skeleton (48px) + three stacked bars (70%, 50%, 90% widths).

### 3.4 Empty State

Use existing `EmptyState` component:
- Heading: "No messages yet"
- Body: "Messages with your service providers appear here after you book a job."
- CTA: "Browse providers" → `/(homeowner)/(tabs)/book`

Provider role body: "Messages from homeowners appear here once they book a job with you."

### 3.5 Error State

Use existing `QueryErrorState` component (already in place).

### 3.6 Tab Badge (Unread Count)

The homeowner tab bar should badge the Inbox tab icon with the total `unreadCount` across all threads. Implementation: sum `threads.map(t => t.unreadCount)` and pass to the Expo Router tab `tabBarBadge` prop. This is a tab-level concern, not inbox-screen-level. Currently deferred (per MESSAGING_NOTES Task 4) — this spec formalizes what to build.

---

## 4. Thread Screen — Full Spec

### 4.1 Screen Layout (top to bottom)

```
┌──────────────────────────────────────┐
│ [Safe area top]                       │
├──────────────────────────────────────┤
│ HEADER BAR (56px)                    │
│ [←] [Avatar 32] [Name + role]  [↗]  │
│              [Job context]           │
├──────────────────────────────────────┤
│                                      │
│  MESSAGE LIST (FlatList)             │
│  ─ Empty thread panel (no messages)  │
│  ─ Day separator pill                │
│  ─ Unread divider bar                │
│  ─ Bubbles (grouped by sender/time)  │
│  ─ Typing indicator bubble           │
│                                      │
├──────────────────────────────────────┤
│ QUICK REPLY CHIPS (conditional)      │
├──────────────────────────────────────┤
│ COMPOSER BAR                         │
│ [Camera] [Input…………………] [Send]      │
│ [Safe area bottom]                   │
└──────────────────────────────────────┘
```

### 4.2 Header Bar

**Height:** 56px + top safe area. `borderBottomWidth: 1`, `borderBottomColor: colors.divider`.

**Left group (`flexDirection: 'row'`, `gap: 10`, `alignItems: 'center'`):**
- Back arrow: `ChevronLeft` (lucide), 24px, `colors.textPrimary`, `hitSlop: 8`, 44×44px tap target
- Avatar: 32×32px circle (fallback: initial letter)
- Name+role column:
  - Name: `textStyles['title-md']`, `colors.textPrimary`, `numberOfLines: 1`
  - Role badge: `Pill` component, 10px text, `tone="primary"` with custom label: "Homeowner" or "Provider" — 22px height. Sits right of the name on the same line if name is short, OR below the name on a second line if name is long. Use `flexWrap: 'wrap'` on the name+badge row.
  - **Job context (second line):** `textStyles['body-sm']`, `colors.textTertiary`, `numberOfLines: 1`
    - Format: `{serviceType} · {statusLabel}` — e.g., "HVAC Tune-Up · Scheduled"
    - Tapping this line navigates to the job detail screen: `router.push(\`/(homeowner)/jobs/${jobId}\`)`
    - Show a tiny `ChevronRight` (12px, `colors.textTertiary`) inline to signal tappability

**Right control:**
- "View Job" tappable element: `ExternalLink` or `ChevronRight` icon (20px, `colors.textSecondary`)
- `hitSlop: 8`, navigates to job detail
- Label text is optional (icon-only is fine — add `accessibilityLabel="View job"`)

**Data source for header:** The thread screen currently infers the name from messages. It should instead receive `otherPartyName`, `otherPartyAvatarUrl`, `jobServiceType`, `jobStatus`, and `jobId` as route params OR derive from the TanStack Query cache for the thread list. The simplest path: pass `otherPartyName` + `jobId` as route params (already done for navigation) and run a `useJob(jobId)` query for the additional metadata.

### 4.3 Message List

**Component:** `FlatList` (replace `ScrollView`). Reason: FlatList virtualizes rows for long conversations, allows `onEndReachedThreshold` for pagination, and supports `getItemLayout` for scroll restoration.

**Not inverted** — keep the current bottom-up scroll convention (newest at bottom). Use `ref.scrollToEnd({ animated: false })` on initial load and `animated: true` on new message arrival.

**Scroll behavior:**
- On mount: `scrollToEnd({ animated: false })`
- On new message arrival (messages.length change): if the list was scrolled near the bottom (within 200px of end), `scrollToEnd({ animated: true })`; otherwise show a floating "New message ↓" pill button
- On pull-to-refresh at top: trigger `loadOlderMessages()` (keyset pagination)

**Item spacing:** `gap: 6` between bubbles in the same sender group, `gap: 12` between groups.

**Content padding:** `paddingHorizontal: 16`, `paddingBottom: 24`, `paddingTop: 12`.

### 4.4 Message Grouping Logic

A sender group = consecutive messages from the same `fromUserId` where the `sentAt` timestamps are within 5 minutes of each other.

```
// Grouping rules (pseudocode)
messages.forEach((msg, i) => {
  const prev = messages[i - 1];
  const next = messages[i + 1];
  const sameSenderAsPrev = prev && prev.fromUserId === msg.fromUserId
    && diffMinutes(msg.sentAt, prev.sentAt) < 5;
  const sameSenderAsNext = next && next.fromUserId === msg.fromUserId
    && diffMinutes(next.sentAt, msg.sentAt) < 5;

  msg._groupPosition =
    !sameSenderAsPrev && !sameSenderAsNext ? 'solo'
    : !sameSenderAsPrev && sameSenderAsNext ? 'first'
    : sameSenderAsPrev && sameSenderAsNext  ? 'middle'
    : 'last';
});
```

**Border radius per position:**

| Position | My bubble (right) | Their bubble (left) |
|---|---|---|
| solo | 18/18/4/18 (tr/tl/br/bl) | 18/18/18/4 |
| first | 18/18/8/18 | 18/18/18/8 |
| middle | 8/18/8/18 | 18/8/18/8 |
| last | 8/18/4/18 | 18/8/18/4 |

(Values are topRight, topLeft, bottomRight, bottomLeft — the "tail" corner is 4px on `last` and `solo`, 8px on `first` and `middle`.)

**Avatar (their side only):**
- 28px circle, shown only on `solo` and `last` position bubbles
- On `first` and `middle`: replaced by a 28px transparent spacer (preserves horizontal alignment)
- Position: `alignSelf: 'flex-end'` within the bubble row so it aligns to the base of the last bubble

**Timestamp:**
- Shown inside every bubble: bottom-right of the bubble content area
- Font: `Inter_400Regular`, 10px
- Color: `rgba(255,255,255,0.65)` (my bubbles), `colors.textTertiary` (their bubbles)
- On `middle` and `first` bubbles of a group: timestamp is hidden (only show on `solo` and `last`)
- This reduces visual clutter; time is still available via tap-and-hold (long press reveals)

**Long-press on bubble:**
- Opens a compact action sheet (via `BottomSheetWrapper`): "Copy text", "Report message"
- Show timestamp at the top of the sheet: "Sent Mon Jun 24 at 2:30 PM"

### 4.5 Day Separator

Rendered between any two messages that fall on different calendar days.

```
┌──────────────────────────────────┐
│  ──── Today ────                 │
│  ──── Monday, Jun 24 ────        │
│  ──── June 18 ────               │
└──────────────────────────────────┘
```

**Styles:**
- `flexDirection: 'row'`, `alignItems: 'center'`, `marginVertical: 16`, `paddingHorizontal: 20`
- Left/right lines: `flex: 1`, `height: 1`, `backgroundColor: colors.divider`
- Label: `Inter_400Regular`, 11px, `colors.textTertiary`, `paddingHorizontal: 10`
- Labels: "Today", "Yesterday", "Mon Jun 23", "Jun 18" (no year unless prior year)

Implementation: insert as a synthetic list item in the `messages` array (add type `{ type: 'separator', date: string }` to the item union). `FlatList.keyExtractor` handles both types.

### 4.6 Unread Divider

Inserted once per session at the position of the first unread message (from the other party, `read_at IS NULL` at the time of fetch).

```
┌──────────────────────────────────┐
│  ─── New messages ───            │
└──────────────────────────────────┘
```

**Styles:** Same visual as day separator but label uses `Inter_600SemiBold`, 11px, `colors.primary[600]`. Lines are `colors.primary[200]`.

**Timing:** Identify first-unread position BEFORE calling `markRead`. Call `markRead` after 500ms delay on mount (giving the UI one render pass to show the divider). After `markRead` resolves, the divider stays visible for the current session (it's a one-time render flag, not re-evaluated on subsequent renders).

**State:** `const [unreadDividerId, setUnreadDividerId] = useState<string | null>(null)` — captured once on mount from the first `read_at: null` message from the other party. Never updated after that.

### 4.7 Delivery State Icons

Shown only on MY messages (`isMe === true`), inside the bubble next to the timestamp.

| State | Visual | Notes |
|---|---|---|
| `sending` | `ActivityIndicator` 10px, `rgba(255,255,255,0.7)` | Bubble full opacity (not faded) |
| `sent` (confirmed) | Single `Check` icon (lucide), 12px, `rgba(255,255,255,0.7)` | Server row exists |
| `read` | "Seen" text, `Inter_400Regular`, 10px, `rgba(255,255,255,0.65)` | Only on the last MY message where `read_at != null` |

"Read" detection: after `markRead` is called by the other party, the `messages` realtime subscription receives `UPDATE` events (need to add UPDATE subscription — see §6). The last message from current user with `read_at != null` gets the "Seen" indicator. Only show on the last such message (not all).

**Current `opacity: 0.6` on `sending` state — remove.** Full opacity always; the spinner is sufficient to communicate pending state.

**Failed state:**
- Bubble border: `2px solid colors.error` (left-border style does not exist in RN; use `borderWidth: 2, borderColor: colors.error`)
- Below bubble: `"Not delivered · Tap to retry"` in `Inter_400Regular`, 11px, `colors.error`
- Tap the error text OR the bubble to retry (existing `onRetry` handler)

### 4.8 Empty Thread State (No Messages Yet)

When `messages.length === 0`, replace the FlatList content with a centered panel:

```
[Avatar 64px]
[Name]  [VerificationBadge if provider]
─────────────────────────────────
"This is the start of your conversation
about {serviceType}."
─────────────────────────────────
[Quick reply chips — always visible here]
```

- Avatar: 64px circle (layout.avatarLg token)
- Name: `textStyles['title-lg']`, `colors.textPrimary`
- Verification badge: use existing `VerificationBadge` shared component (provider only)
- Separator line: `colors.divider`, 1px, full width, `marginVertical: 20`
- Description: `textStyles['body-md']`, `colors.textSecondary`, `textAlign: 'center'`, `paddingHorizontal: 24`

### 4.9 Typing Indicator

A pseudo-bubble rendered at the bottom of the list when the other party is actively typing.

**Visual:**
- Same bubble shape as "their messages" (white surface, border, left-aligned, 28px avatar visible)
- Content: three animated dots
- Dot specs: 8px circles, `colors.textTertiary` fill, `borderRadius: 4`
- Animation: using Reanimated 4 `withSequence(withTiming(1, {duration: 300}), withTiming(0.4, {duration: 300}))` on `scale` — staggered with 200ms delay per dot
- The bubble appears/disappears with `FadeIn`/`FadeOut` from Reanimated layout animations

**Data source:** Supabase Realtime Presence on `channel(\`thread:presence:${jobId}\`)` (separate from the messages postgres_changes channel). When the other party focuses the TextInput and types, they broadcast `{ user_id, typing: true }`. On blur or after 2s of no keystrokes, they broadcast `typing: false` (or just let presence expire).

**Implementation:** New function `useTypingPresence(jobId, myUserId)` in `lib/messaging/`. Returns `{ isOtherTyping: boolean, broadcastTyping: (isTyping: boolean) => void }`. Hook into TextInput `onChangeText` (throttled to broadcast at most once per 1s) and `onBlur`.

### 4.10 Quick Reply Chips

Shown **only** when `messages.length < 3` OR when no message has been sent in the last 30 minutes and the last message was from the other party. Hidden once the conversation has 3+ messages. (Never show when the current user just sent the last message.)

**Layout:** Horizontal `ScrollView` (no paging), `showsHorizontalScrollIndicator: false`, `paddingHorizontal: 16`, `paddingVertical: 8`, `gap: 8`. Background: `colors.background`. Top border: `colors.divider`.

**Chips:** Use existing `Chip` component (if it supports an onPress prop) or `Pill`. Style: outline variant (transparent bg, `colors.primary[600]` border and text), `borderRadius: 999`.

**Homeowner chip set:**
1. "What time will you arrive?"
2. "Can you send an estimate?"
3. "Looks great, thank you!"
4. "I have a question about the quote"

**Provider chip set:**
1. "I'll be there at 8 AM"
2. "On my way now"
3. "Job is complete"
4. "I need to reschedule"

**Tap behavior:** Pre-fills the TextInput (does NOT auto-send). The user sees the text in the input, can edit, then hit send. This is safer than auto-send for professional communication.

### 4.11 Composer Bar

**Height:** Auto-expanding, minimum 60px, maximum 5 lines of text. Background: `colors.surface`. Top border: `1px colors.border`.

**Layout:** `flexDirection: 'row'`, `alignItems: 'flex-end'`, `paddingHorizontal: 12`, `paddingVertical: 10`, `gap: 8`.

**Camera button (left):**
- `Camera` icon (lucide), 22px, `colors.textSecondary`
- `hitSlop: 12`
- On press: `expo-image-picker` → pick from library OR take photo
- Sends as an image attachment (see §6.3)

**TextInput (center):**
- `flex: 1`, `fontFamily: 'Inter_400Regular'`, `fontSize: 15`, `color: colors.textPrimary`
- Background: `colors.divider`, `borderRadius: 22`
- Padding: `paddingVertical: 10`, `paddingHorizontal: 16`
- `multiline: true`, `maxHeight: 110` (approx 5 lines)
- Placeholder: `"Message {otherPartyFirstName}…"` — personalized, not generic
- `placeholderTextColor: colors.textTertiary`
- On change: trigger typing broadcast (throttled, see §4.9)

**Send button (right):**
- 40×40px circle
- Active (input non-empty): `colors.primary[600]` bg, `Send` icon (lucide 18px, `colors.textInverse`)
- Inactive (input empty): `colors.border` bg, `Send` icon 18px, `colors.textTertiary`
- `disabled={!input.trim() || sendM.isPending}`
- Animate: `Reanimated.withSpring` scale 0.95→1.0 on each press (existing `usePress()` pattern)
- Accessibility: `accessibilityLabel="Send message"`

**Keyboard handling:**
- iOS: `KeyboardAvoidingView behavior="padding"`, `keyboardVerticalOffset` = header height (56) + status bar height (from `useSafeAreaInsets().top`)
- Android: `KeyboardAvoidingView behavior="height"` or `windowSoftInputMode="adjustResize"` (AndroidManifest)

### 4.12 "New message" floating button

When the user has scrolled up (not at the bottom) and a new message arrives:
- Show a floating pill button anchored to the bottom-center of the message list, above the quick replies / composer
- Style: `colors.primary[600]` bg, `textInverse` text, `borderRadius: 999`, `paddingHorizontal: 16`, `paddingVertical: 8`
- Label: "New message ↓" or "1 new message ↓" if count known
- Tap: `scrollToEnd({ animated: true })`
- Dismiss: auto-hides when user scrolls back to bottom
- Appear/disappear: `FadeIn`/`FadeOut` with 150ms duration (Reanimated layout animation)

---

## 5. Provider Side — Differences

The provider inbox and thread screens are structurally identical to the homeowner versions. The only differences:

**Inbox:**
- Rows show homeowner name (not provider name)
- Job context line: same format, `{serviceType} · {statusLabel}` — useful for the provider seeing multiple homeowner jobs
- Empty state body: "Messages from homeowners appear here once they book a job with you."

**Thread header:**
- Role badge: "Homeowner" (not "Provider")
- "View job" still navigates to job detail (provider's job detail screen)

**Quick reply chips:** Provider set (§4.10 above)

**Role derivation:** `fromRole` is `'provider_owner'` or `'provider_tech'` — existing logic, unchanged.

---

## 6. Backend Additions Required

### 6.1 Thread Metadata Enrichment (Required for inbox context line + thread header)

**Change:** `listThreadsForHomeowner` and `listThreadsForProvider` must join the `jobs` table to pull `service_type`, `status`, and optionally `scheduled_at`.

```typescript
// Current
.select('id, provider_id, providers(display_name, business_name, avatar_url)')

// Updated
.select('id, provider_id, service_type, status, scheduled_at, providers(display_name, business_name, avatar_url)')
```

**Thread type extension:**
```typescript
export interface Thread {
  jobId: string;
  otherPartyName: string;
  otherPartyAvatarUrl: string | null;
  lastPreview: string;
  lastSentAt: string;
  unreadCount: number;
  // NEW
  jobServiceType: string | null;
  jobStatus: string | null;
  jobScheduledAt: string | null;
}
```

No DB migration needed — `jobs.service_type` and `jobs.status` already exist.

### 6.2 Read Receipt Realtime Subscription (Required for "Seen" indicator)

**Change to `subscribeToMessages` in `lib/api/realtime.ts`:** also subscribe to `UPDATE` events on the messages table for `job_id=eq.${jobId}`. When a `read_at` change arrives (previously null, now a timestamp), surface it in the UI.

```typescript
// Add to openChannel bind callback:
.on('postgres_changes',
  { event: 'UPDATE', schema: 'public', table: 'messages', filter: `job_id=eq.${jobId}` },
  (payload) => {
    const updated = payload.new as DbMessageRow;
    if (updated.read_at && !payload.old?.read_at) {
      onReadReceipt?.(updated.id, updated.read_at);
    }
  }
)
```

**`useThreadMessages` addition:** accept an optional `onReadReceipt` callback and expose `lastReadMessageId` (the last message ID sent by current user that now has `read_at != null`). No DB migration needed.

### 6.3 Typing Indicators — Realtime Presence (Required for typing indicator)

No DB migration. Uses Supabase Realtime Presence (in-memory, ephemeral).

**New file: `lib/messaging/useTypingPresence.ts`**
```typescript
// Pseudocode — not a code file, just spec
function useTypingPresence(jobId: string, myUserId: string) {
  // supabase.channel(`thread:presence:${jobId}`).track({ user_id: myUserId, typing: true/false })
  // Subscribe to presenceState changes → filter for !myUserId → isOtherTyping
  // broadcastTyping(true) on TextInput change (throttle 1000ms)
  // broadcastTyping(false) on blur or 2s after last keystroke
  return { isOtherTyping: boolean, broadcastTyping: (v: boolean) => void }
}
```

**Security note:** Presence events are scoped to the channel name `thread:presence:{jobId}`. Any authenticated user who knows a `jobId` can join that channel. The participant RLS on the `messages` table prevents message access, but presence has no RLS equivalent. For MVP this is acceptable — the typing indicator leaks nothing but "someone is typing." Flag for a security review before scale.

### 6.4 Photo Attachments (Phase 2 — defer post-MVP)

Scope this as a separate task. The camera icon in the composer should be stubbed to show a toast "Photo attachments coming soon" at MVP rather than silently doing nothing (which is the current paperclip behavior).

**When built, the required changes:**
- DB migration: `ALTER TABLE messages ADD COLUMN attachment_url text, ADD COLUMN attachment_type text CHECK (attachment_type IN ('image'));`
- Supabase Storage bucket: `message-attachments`, public: false
- Storage RLS: `(storage.foldername(name))[1] = job_id AND is_job_participant((storage.foldername(name))[1]::uuid)`
- Path convention: `message-attachments/{job_id}/{message_id}.jpg`
- API: `uploadAttachment({ file, jobId, messageId }) → string (URL)`
- `send()` accepts `attachmentUrl?: string`, `attachmentType?: 'image'`
- Bubble variant: image bubble (no text body, just `<Image>` at `maxWidth: 240, maxHeight: 240`, `borderRadius` matches bubble position, tap → `expo-image-viewer` full-screen)

### 6.5 Keyset Pagination (Required for long conversation histories)

**New API function in `lib/api/messages.ts`:**
```typescript
export async function listForJobPage(
  jobId: string,
  options: { before?: string; limit?: number } = {}
): Promise<{ messages: Message[]; hasMore: boolean }>
```
- `before` is the `sent_at` ISO string of the oldest currently-loaded message
- Query: `.lt('sent_at', before)` `.order('sent_at', { ascending: false })` `.limit(limit + 1)` (check `hasMore` by seeing if `limit + 1` rows returned, then slice to `limit`)
- Initial load: no `before` → loads most recent 30 messages

**`useThreadMessages` changes:**
- Add `hasMore: boolean` and `loadOlder: () => void` to the return type
- Initial fetch uses `listForJobPage` (most recent 30)
- `loadOlder()` calls `listForJobPage({ before: messages[0].sentAt })`
- Prepend results to the front of the messages array
- `FlatList` `refreshControl`: on pull-down at top, call `loadOlder()`

**Compatibility note:** the existing `listForJob` function used by the desktop split-pane `ThreadDetail` in `inbox.tsx` can remain for now (web has no pagination yet). Flag for follow-up.

### 6.6 Unread Tab Badge

**Change to `/(homeowner)/(tabs)/inbox.tsx`:** after the threads query resolves, compute `totalUnread = threads.reduce((acc, t) => acc + t.unreadCount, 0)` and set it on the Expo Router tab option. Since the tab file is a screen component, use the `<Tabs.Screen options={{ tabBarBadge: totalUnread > 0 ? totalUnread : undefined }}>` pattern or the `useNavigation` hook to update the tab options imperatively.

The provider inbox currently has no tab bar entry at all (per MESSAGING_NOTES §Task 4). Spec: add a Messages tab to the provider tab bar (`/(provider)/(tabs)/inbox` route) with the same badge logic.

---

## 7. Component Inventory

### Components to create (new)

| Component | Location | Description |
|---|---|---|
| `MessageBubble` | `components/messaging/MessageBubble.tsx` | Replaces inline `Bubble`. Accepts `message`, `groupPosition`, `isMe`, `showAvatar`, `showTimestamp`, `onRetry`, `onLongPress`. |
| `DaySeparator` | `components/messaging/DaySeparator.tsx` | Centered date label between message groups. |
| `UnreadDivider` | `components/messaging/UnreadDivider.tsx` | "New messages" divider bar. |
| `TypingIndicator` | `components/messaging/TypingIndicator.tsx` | Animated 3-dot bubble. |
| `QuickReplyChips` | `components/messaging/QuickReplyChips.tsx` | Horizontal scroll chip strip. `onSelect: (text: string) => void`. |
| `NewMessagePill` | `components/messaging/NewMessagePill.tsx` | Floating "↓ new message" button. |
| `ThreadEmptyPanel` | `components/messaging/ThreadEmptyPanel.tsx` | Empty conversation panel with avatar + description. |
| `useTypingPresence` | `lib/messaging/useTypingPresence.ts` | Presence hook for typing indicators. |

### Components to modify (surgical)

| Component | File | Change |
|---|---|---|
| `ThreadRow` | `inbox.tsx` (both roles) | Add job context line, update unread badge from dot to count pill, add "You: " prefix to preview |
| `useThreadMessages` | `lib/messaging/useThreadMessages.ts` | Add `hasMore`, `loadOlder`, `lastReadMessageId`, `unreadDividerId` |
| `subscribeToMessages` | `lib/api/realtime.ts` | Add UPDATE event subscription for read receipts |
| `listThreadsForHomeowner/Provider` | `lib/api/messages.ts` | Add `service_type`, `status`, `scheduled_at` to job select |
| `Thread` type | `lib/api/messages.ts` | Add `jobServiceType`, `jobStatus`, `jobScheduledAt` fields |

### Components to reuse (unchanged)

- `BottomSheetWrapper` — for bubble long-press action sheet
- `VerificationBadge` — in thread empty panel (provider side)
- `EmptyState` — inbox empty state (no changes needed)
- `QueryErrorState` — inbox error state (no changes needed)
- `SkeletonLoader` — inbox loading state (no changes needed)
- `Pill` — status chips in header and thread rows
- `usePress` — press animation on thread rows (unchanged)
- `enterStaggered` — row animation (unchanged)

---

## 8. Interaction & Animation Details

| Interaction | Mechanism | Duration |
|---|---|---|
| Row press | `usePress()` — scale 0.98, `withSpring` | 100ms |
| Bubble appear (optimistic send) | `FadeInDown` layout animation | 150ms |
| Typing indicator appear/disappear | `FadeIn`/`FadeOut` layout animation | 200ms |
| New message pill appear/disappear | `FadeIn`/`FadeOut` | 150ms |
| Quick reply chips scroll | `ScrollView` horizontal, momentum | native |
| Send button disabled→enabled | `withSpring` scale 0.9→1.0 on input non-empty | 200ms |
| Dot animation (typing indicator) | `withSequence(withTiming(1), withTiming(0.4))` staggered 200ms | 300ms/cycle |

All animations use Reanimated 4. No `Animated` from `react-native`.

---

## 9. Accessibility

- Every interactive element has `accessibilityLabel`
- Back button: `"Go back"`
- Send button: `"Send message"`
- Camera button: `"Attach photo"`
- Avatar: `"{name}'s avatar"`
- Thread row: `"{name}, {job context}, {preview}, {time ago}, {unread count} unread messages"` (combine into single `accessibilityLabel`)
- Typing indicator: `accessibilityLabel="Other person is typing"`, `accessibilityLiveRegion="polite"`
- Unread divider: `accessibilityRole="header"`, label "Unread messages start here"
- WCAG AA contrast: `colors.textTertiary (#9CA3AF)` on `colors.surface (#FFF)` = 2.85:1 — fails for body text at small sizes. Enforce `colors.textSecondary (#6B7280)` minimum for any text over 11px (contrast 4.63:1 — passes). The 10px timestamp inside bubbles is below 11px threshold; acceptable as decorative/supplementary info.

---

## 10. Edge Cases

| Case | Handling |
|---|---|
| Very long message (500+ chars) | `Text` wraps naturally; bubble max-width 78% unchanged; no scroll-within-bubble |
| Consecutive messages same second | Tiebreak by `id` (existing sort); both treated as grouped |
| Job has no service_type yet | Omit job context line from header and inbox row; header shows name only |
| Other party has no avatar | Fallback initial letter (existing pattern) |
| Thread with 0 messages | Show `ThreadEmptyPanel` (§4.8) instead of empty FlatList |
| Messages load while keyboard open | `scrollToEnd` fires after keyboard height settles; `KeyboardAvoidingView` handles layout shift |
| Very fast typing (< 100ms keystrokes) | Typing broadcast is throttled to 1 message/second; no spam risk |
| Realtime connection drops | Messages continue via TanStack Query poll (if configured); typing indicator disappears (presence expires). Show no degradation indicator at MVP. |
| Multi-send (double-tap send) | `clientId` dedup on the server (unique constraint `from_user_id, client_id`) prevents duplicate rows; idempotent send already built. |
| Provider tech role | `fromRole: 'provider_tech'` handled by existing `useThreadMessages`; header shows "Provider Tech" badge |
| Desktop web (split-pane) | `ThreadDetail` component in `inbox.tsx` (desktop) should eventually use the same `MessageBubble` component; in the short term it continues using its own inline `Bubble` function. Flag as tech debt. |

---

## 11. What Stays the Same

- `client_id` dedup + optimistic send + tap-to-retry flow — already production-quality, no changes
- Supabase `postgres_changes` for realtime message delivery — keep for MVP
- `is_job_participant` RLS functions — unchanged
- `markRead` logic (bulk stamp on open) — kept, only timing adjusted (500ms delay for unread divider)
- `useThreadMessages` core contract — `messages`, `send`, `retry` — unchanged; additive fields only
- Job-scoped only (no pre-booking DMs) — upheld

---

## 12. Build Sequence

Ordered by risk and dependency:

1. **Thread metadata join** — low risk, additive query change. Enables job context in both header and inbox rows.
2. **MessageBubble + grouping** — pure UI, no data changes. Highest visual impact. Build and verify on simulator first.
3. **DaySeparator + UnreadDivider** — lightweight synthetic list items. Timing change to `markRead` is the main risk (test that it doesn't cause a flicker where unread count persists).
4. **Delivery state icons + read receipt subscription** — requires the UPDATE subscription addition to `realtime.ts`.
5. **TypingIndicator + useTypingPresence** — Presence channel is new infrastructure; test on two sim instances.
6. **QuickReplyChips** — purely additive UI layer.
7. **Keyset pagination** — higher complexity, lower urgency (conversations are short at MVP). Sequence last.
8. **Tab badge (provider inbox tab)** — product decision: add to provider tab bar. Coordinate with nav architecture.
9. **Photo attachments** — Phase 2. Camera icon shows "coming soon" toast at MVP.
