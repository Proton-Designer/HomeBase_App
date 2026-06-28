# Notification System Audit — 2026-06-24

READ-ONLY mapping of the current state. No code was modified.

---

## 1. Bell Component — Current Wiring (WRONG)

**File:** `apps/mobile/app/(homeowner)/(tabs)/index.tsx`  
**Lines 272–292**

```tsx
<Pressable
  onPress={() => router.push('/(homeowner)/(tabs)/inbox')}
  accessibilityLabel="Notifications"
>
  <Bell size={20} color={colors.textPrimary} />
</Pressable>
```

The bell icon routes to `/(homeowner)/(tabs)/inbox`, which is the **Messages/Inbox tab** — not a notifications list. The label says "Notifications" but the destination is chat threads. There is:
- No unread badge on the bell.
- No `notifications` query feeding a count.
- No route to any notification center screen.

The bell is the ONLY entry point for notifications on the homeowner home tab. There is no equivalent bell on the provider side; the provider profile tab has a `SettingsRow label="Notification preferences" Icon={Bell}` at `apps/mobile/app/(provider)/(tabs)/profile.tsx:467`, which is a settings toggle, not an inbox.

---

## 2. The `notifications` Table — State vs Spec

### Spec (BACKEND_GUIDE.md lines 462–474)
```sql
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
RLS is specified in migration `018_rls.sql`:
- `notifications_read_own` — SELECT WHERE user_id = auth.uid()
- `notifications_update_own` — UPDATE WHERE user_id = auth.uid()

### Deployed Reality (HOMEBASE_CONTEXT.md line 247)
The live DB lists **`notification_log`** (not `notifications`) among its 21 tables:
> `profiles, addresses, homeowners, providers, provider_team, bookings, jobs, subscriptions, claims, postings, completion_ledger, demand_events, stripe_accounts, payment_methods, payments, escrow_holdbacks, payouts, routing_decisions, push_tokens, calendar_tokens, notification_log, messages`

**The table was deployed under the name `notification_log`, not `notifications`.** The `send-push-notification` edge function (BACKEND_GUIDE line 2080) inserts into `notifications`, which would fail silently against the real schema. This name mismatch must be confirmed via `mcp__plugin_supabase_supabase__list_tables` before any write.

---

## 3. `lib/api/notifications.ts` — What Exists

**File:** `apps/mobile/lib/api/notifications.ts` (5 lines total)

```ts
import { invokeFn } from './functions';

export async function register(expoPushToken: string, platform: string): Promise<void> {
  await invokeFn('register-push-token', { expoPushToken, platform });
}
```

This module contains exactly **one function**: token registration. There is no:
- `listNotifications(userId)` — fetch notification rows for display
- `markRead(notificationId)` — mark a single notification read
- `markAllRead(userId)` — clear badge
- `getUnreadCount(userId)` — power the bell badge

The module is exported from `lib/api/index.ts:19` as `notifications`, so the namespace exists — it just only has `register`.

---

## 4. Push Token / `expo-notifications` Wiring — State

**Registration flow** (`apps/mobile/app/_layout.tsx` lines 54–79):
1. Fires after `status === 'authenticated'`, native only (skips web).
2. Requests permission via `Notifications.requestPermissionsAsync()`.
3. Calls `Notifications.getExpoPushTokenAsync()`.
4. Calls `notificationsApi.register(tokenData.data, Platform.OS)` → `invokeFn('register-push-token', …)`.

**Edge function:** `register-push-token` is confirmed deployed and ACTIVE (HOMEBASE_CONTEXT.md line 249). It writes to `push_tokens` table.

**Push sender:** `send-push-notification` is confirmed deployed and ACTIVE. It reads `push_tokens`, fires to Expo's `exp.host` push API, and inserts into `notifications` (table name discrepancy noted above).

**Incoming notification handler:** There is NO `Notifications.addNotificationResponseReceivedListener` or `Notifications.addNotificationReceivedListener` registered anywhere in the codebase. When a push arrives while the app is foregrounded, nothing happens beyond the OS banner. When the user taps a push notification to open the app, nothing deep-links to a notification center.

---

## 5. Events That Should Create Notification Rows

Source: `docs/guides/BACKEND_GUIDE.md` lines 2111–2124 (Notification Trigger Map).

| Type | Who triggers | Recipient | Notes |
|---|---|---|---|
| `booking_matched` | `route-booking` / `booking-create` fn | Provider | New job available; accept within 15 min |
| `booking_confirmed` | `job-accept` fn | Homeowner | Provider accepted |
| `booking_declined` | `job-decline` fn | Homeowner | Provider declined; re-routing |
| `job_completed_checkin` | DB trigger `trg_booking_completed` on bookings | Homeowner | Rate provider now |
| `checkin_reminder` | Cron or 30-min delayed fn | Homeowner | If check-in not submitted 30 min after completion |
| `payout_sent` | `stripe-webhook` fn on `transfer.created` | Provider | Payment on the way |
| `instant_payout_ready` | `stripe-webhook` or balance check | Provider | Cash out available |
| `claim_update` | `claim-create` fn or admin update | Both parties | Claim status changed |
| `verification_approved` | Admin action / `provider-onboard` | Provider | Tier 2 verification approved |
| `booking_cancelled` | Booking status → `cancelled` | Both parties | Cancellation notice |
| `new_message` | `messages` table INSERT | Counterparty | Not in the trigger map but required for cross-role alerting |
| `quote_received` | Provider responds to a posting | Homeowner | Not in trigger map; implied by postings flow |
| `reminder_due` | Cron / `recompute-trust-scores-nightly` or separate cron | Homeowner | Maintenance reminder (see ROADMAP 2026-06-23 §2) |

All 10 spec types plus 3 additional ones (`new_message`, `quote_received`, `reminder_due`) should write rows to the notification table AND fire a push.

---

## 6. What Is Completely Missing (Gap Summary)

| Gap | Severity |
|---|---|
| Bell navigates to Messages inbox instead of a notifications list | Critical — wrong destination |
| No unread badge count on the bell | High — no visual indicator |
| No `listNotifications`, `markRead`, `markAllRead`, `getUnreadCount` in `lib/api/notifications.ts` | Critical — no read path exists |
| No notification center screen in Expo Router | Critical — screen doesn't exist |
| No Supabase Realtime subscription for live notification updates | High — count won't refresh without polling |
| `send-push-notification` inserts into `notifications` but deployed table is `notification_log` | Critical — all notification writes may silently fail |
| No `addNotificationResponseReceivedListener` — push taps don't deep-link | High — push is fire-and-forget |
| Provider has no bell / no notification entry point | Medium — providers miss all non-push alerting |
| No `checkin_reminder` / `new_message` / `reminder_due` events defined in edge functions | Medium — trigger map incomplete |

---

## 7. Build Spec — Exactly What to Build

### 7.1 Resolve Table Name

Before writing any client code, confirm the real column layout:
```
mcp__plugin_supabase_supabase__execute_sql:
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name IN ('notifications', 'notification_log')
  ORDER BY table_name, ordinal_position;
```
If the table is `notification_log`, every reference below that says `notifications` should use that name. If it is missing both names, apply the migration from BACKEND_GUIDE.md §016 with the correct name.

---

### 7.2 Notifications API Module

**File:** `apps/mobile/lib/api/notifications.ts` (extend existing file)

Add to the existing `register` export:

```ts
import { supabase } from '../supabase';

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  sent_at: string;
};

/** Fetch newest 50 notifications for the current user, unread first. */
export async function list(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notification_log')           // use real table name after §7.1
    .select('id, type, title, body, data, read_at, sent_at')
    .order('sent_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

/** Count unread rows — drives the bell badge. */
export async function unreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notification_log')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

/** Mark a single notification read. */
export async function markRead(id: string): Promise<void> {
  await supabase
    .from('notification_log')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
}

/** Mark ALL unread notifications read (clear badge). */
export async function markAllRead(): Promise<void> {
  await supabase
    .from('notification_log')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
}
```

---

### 7.3 TanStack Query Keys

Add these query keys to `apps/mobile/lib/queryKeys.ts` (or inline if no central file):

```ts
notifications: {
  list: (userId: string) => ['notifications', userId] as const,
  unreadCount: (userId: string) => ['notifications', 'unread', userId] as const,
}
```

---

### 7.4 Notification Center Screen

**New file:** `apps/mobile/app/(homeowner)/notifications.tsx`

This is a modal-style stack screen (not a tab). The homeowner layout already has a `Stack` within `(homeowner)` — register it in `apps/mobile/app/(homeowner)/_layout.tsx` with `headerShown: false`.

Screen layout:
- `SafeAreaView` with `edges={['top']}`, background `colors.background`.
- Header row: back chevron (left) + "Notifications" title (center, `textStyles['editorial-title']`) + "Mark all read" link (right, `colors.primary[600]`).
- `FlatList` of `NotificationRow` items. Pull-to-refresh.
- Each `NotificationRow`:
  - Left: icon keyed to `type` (e.g. `CheckCircle` for `job_completed_checkin`, `MessageCircle` for `new_message`, `DollarSign` for `payout_sent`, `AlertCircle` for `claim_update`, `Home` for `booking_confirmed`, etc.) in a 40×40 circle at `colors.primary[100]`.
  - Center: `title` (bold if unread), `body` (secondary), `formatDistanceToNowStrict` timestamp.
  - Right: filled green dot 8×8 if `read_at` is null.
  - `onPress`: call `markRead(id)`, then navigate to the relevant deep-link from `data` (e.g. `data.jobId → /(homeowner)/job/[id]`, `data.claimId → /(homeowner)/claims/[id]`).
- Empty state: `EmptyState` component with "All caught up" heading.

TanStack Query usage:
```ts
const { data: notifications = [], refetch } = useQuery({
  queryKey: ['notifications', userId],
  queryFn: () => notificationsApi.list(),
  enabled: !!userId,
});
```

Realtime: subscribe to the `notification_log` Supabase channel filtered to `user_id=eq.${userId}` for INSERT events. On insert: invalidate both `notifications` and `notifications.unread` query keys.

---

### 7.5 Bell → Notification Center Wiring + Badge

**File:** `apps/mobile/app/(homeowner)/(tabs)/index.tsx`

Change line 273:
```tsx
// BEFORE:
onPress={() => router.push('/(homeowner)/(tabs)/inbox')}

// AFTER:
onPress={() => router.push('/(homeowner)/notifications')}
```

Add unread badge. Add a query above the JSX:
```ts
const { data: unread = 0 } = useQuery({
  queryKey: ['notifications', 'unread', userId],
  queryFn: () => notificationsApi.unreadCount(),
  enabled: !!userId,
  refetchInterval: 60_000,   // poll every 60 s as a backstop
});
```

Add badge overlay on the bell `Pressable`:
```tsx
{unread > 0 && (
  <View style={{
    position: 'absolute',
    top: 8, right: 8,
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,    // red dot
  }} />
)}
```

For count > 0 show `{unread > 9 ? '9+' : unread}` as a badge label (optional, design call).

---

### 7.6 Register Screen in `(homeowner)/_layout.tsx`

**File:** `apps/mobile/app/(homeowner)/_layout.tsx`

Add:
```tsx
<Stack.Screen name="notifications" options={{ headerShown: false, presentation: 'modal' }} />
```

---

### 7.7 Push Tap Deep-link

**File:** `apps/mobile/app/_layout.tsx`

Add inside `AuthBootstrap`:
```ts
useEffect(() => {
  if (Platform.OS === 'web') return;
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, string>;
    if (data?.jobId) router.push(`/(homeowner)/job/${data.jobId}`);
    else if (data?.claimId) router.push(`/(homeowner)/claims/${data.claimId}`);
    else router.push('/(homeowner)/notifications');
  });
  return () => sub.remove();
}, []);
```

---

### 7.8 Provider Notification Entry Point

Provider has no bell at all. The spec (FRONTEND_GUIDE §5) doesn't explicitly call for a bell, but notification types `booking_matched`, `payout_sent`, `verification_approved`, `claim_update`, `booking_cancelled` all target providers. Minimum viable:

1. Add a bell `Pressable` to the provider Today tab header (`apps/mobile/app/(provider)/(tabs)/today.tsx`) mirroring the homeowner pattern.
2. Create `apps/mobile/app/(provider)/notifications.tsx` — same component as the homeowner version; the RLS policy already filters to `user_id = auth.uid()` so the same query is safe for both roles.
3. Register in `apps/mobile/app/(provider)/_layout.tsx`.

---

### 7.9 Backend — Missing Event Wiring

These events are listed in the trigger map but are not confirmed to fire in any deployed edge function:

| Event | What needs doing |
|---|---|
| `new_message` | `send-message` edge function (or messages insert trigger) must call `send-push-notification` for the recipient of the thread. Currently the messages system has no push coupling — see MESSAGING_NOTES.md which says the realtime subscription is the only delivery. |
| `checkin_reminder` | A 30-minute delayed trigger after `bookings.status → completed`. Either a `pg_cron` job or a Supabase scheduled function. Not referenced in any deployed function. |
| `reminder_due` | Maintenance reminders (from `home_service_status`). ROADMAP §2 says this is a desired push type but it is not wired. |

These are backend tasks, not frontend, but the notification center screen must handle these types in its icon map.

---

## 8. File Manifest for the Build

| Action | File |
|---|---|
| Confirm table name, add missing columns if needed | Supabase migration (new) |
| Extend notifications API | `apps/mobile/lib/api/notifications.ts` |
| New screen (homeowner) | `apps/mobile/app/(homeowner)/notifications.tsx` |
| Register screen in layout | `apps/mobile/app/(homeowner)/_layout.tsx` |
| Fix bell navigation + add badge | `apps/mobile/app/(homeowner)/(tabs)/index.tsx` |
| Push tap deep-link listener | `apps/mobile/app/_layout.tsx` |
| New screen (provider) | `apps/mobile/app/(provider)/notifications.tsx` |
| Register screen in provider layout | `apps/mobile/app/(provider)/_layout.tsx` |
| Add bell to provider Today tab | `apps/mobile/app/(provider)/(tabs)/today.tsx` |
| Wire `new_message` push | `send-push-notification` edge fn or message trigger |
| Wire `checkin_reminder` delayed fn | New edge fn or pg_cron entry |

---

*Audit by subagent — read-only pass, 2026-06-24.*
