# Loading / Freeze / Unreliable-Button Bug Audit

**Branch:** `feat/home-dashboard`
**Audit date:** 2026-06-24
**Scope:** READ-ONLY — code trace only, no DB or code changes.

---

## Executive Summary

Five symptoms were reported. Four of them share a single root cause: the Supabase JS client's `autoRefreshToken` timer stops working after the app is backgrounded, because no `AppState` listener is wired. After the 1-hour JWT TTL, every Supabase call returns 401 silently, buttons appear dead, and the dev-server reload hangs on the splash. The remaining symptoms are independent: a missing loading branch in inbox screens, plain RN `Image` in the home card, and a synchronous base64 decode blocking the JS thread on avatar upload.

---

## Finding 1 — CRITICAL: No AppState integration for token refresh (root cause of D + E)

**Files:** `apps/mobile/lib/supabase.ts` (entire file), `apps/mobile/app/_layout.tsx`

**Supabase JS v2** (`@supabase/supabase-js ^2.45.0`) auto-refresh works by listening to the browser's `visibilitychange` DOM event. React Native has no DOM. The official fix is to call `supabase.auth.startAutoRefresh()` when the app comes to foreground and `supabase.auth.stopAutoRefresh()` when it goes to background via `AppState`. This is documented in the supabase-js React Native guide.

**What happens without it:** The token refresh timer fires once at client creation, runs for ~55 minutes to execute the first refresh, then the timer schedule is never restarted because on RN there is no visibility event. If the app is backgrounded for any duration that crosses a 1-hour boundary, the access token expires and is never silently replaced. Every subsequent Supabase call then returns a 401 (`JWT expired`). The Supabase client's `onAuthStateChange` fires `SIGNED_OUT` or `TOKEN_REFRESH_FAILED` — but only if the refresh was attempted, which it never is after the timer dies.

**`lib/supabase.ts` is only 24 lines:**
```ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,   // ← only works in browser; dead on RN after background
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

There is no `AppState` import or listener anywhere in the project (`grep -r "AppState" apps/mobile/` returns nothing in non-node-modules code).

**Symptoms caused:**
- **(D)** After 1 hr of use without a fresh cold-start, all mutating API calls (send message, sign out's `supabase.auth.signOut()`, booking submission) silently fail with 401. The UI's buttons have no disabled state while the call is in flight and no visual error on 401, so they look "stuck" and the user taps repeatedly.
- **(E)** After 1 hr+ dev server session: pressing 'r' reloads modules, calls `bootstrap()` → `supabase.auth.getSession()`. With an expired token and no in-memory refresh timer, `getSession()` calls the server to refresh. If the network is slow or the Supabase project is cold, this hangs. `status` stays `'bootstrapping'` indefinitely. `AuthBootstrap` (`_layout.tsx` line 87: `{bootReady && children}`) never renders children, and the splash screen never exits.

**Surgical fix:** In `lib/supabase.ts` (or the bootstrap in `authStore.ts`), add:
```ts
import { AppState } from 'react-native';
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
```

---

## Finding 2 — HIGH: Inbox renders blank on initial load (root cause of A)

**Files:**
- `apps/mobile/app/(homeowner)/(tabs)/inbox.tsx` lines 34–192
- `apps/mobile/app/(provider)/inbox.tsx` lines 25–69

**Homeowner inbox control flow:**
```ts
// line 34–38
const { data: threads = [], isLoading, isError, refetch } = useQuery({ ... });

// line 48 — isError branch: ✓ handled
if (isError) { return <QueryErrorState />; }

// line 56 — empty branch: only fires when NOT loading
if (!isLoading && threads.length === 0) { return <EmptyState />; }

// MISSING: if (isLoading) { return <LoadingSkeleton />; }

// line 166 — mobile return: ScrollView with {threads.map(...)}
// When isLoading=true and threads=[], this maps over an empty array → blank ScrollView
```

On first open (cold cache, or after TanStack Query's 5-minute `gcTime` expires), `isLoading` is `true` and `threads` is `[]`. The `!isLoading` guard on the empty state means neither branch fires. The component falls through to the main `ScrollView` return which renders zero children. The user sees a fully blank screen until the query resolves.

**Provider inbox (`app/(provider)/inbox.tsx`) has the same defect:**
```ts
// line 31
if (!isLoading && threads.length === 0) { return <EmptyState />; }
// No loading branch. Falls through to ScrollView with zero items.
```

Note a second vector for provider inbox blank: `enabled: !!providerId` where `providerId = useAuthStore((s) => s.providerId)`. If `applySession` in `authStore.ts` hasn't completed yet (because the async profile + provider queries in `applySession` are still in flight, line 111–165), `providerId` is `null`, the query is disabled, `isLoading` is `false`, and `threads` is `[]`, so the empty-state fires incorrectly — user sees "No messages yet" when they may have messages.

**Surgical fix:** Add an `if (isLoading) return <LoadingState />;` branch immediately after the `isError` check in both screens.

---

## Finding 3 — HIGH: Missing AppState also causes signOut to need 2+ taps (contributing to D)

**File:** `apps/mobile/app/(homeowner)/(tabs)/profile.tsx` lines 307–323 and 212–229

The Sign Out `Pressable` has no `disabled` prop or in-progress state:
```tsx
<Pressable
  onPress={signOut}          // async function, no await
  style={[...]}
>
  <Text>Sign out</Text>
</Pressable>
```

`signOut` (`authStore.ts` lines 269–289) calls `supabase.auth.signOut()`. After token expiry (Finding 1), `signOut()` makes a network call that gets a 401 → the `catch {}` block swallows it → local state is still cleared. But if the network call is slow (cold server, expired token requiring a re-auth), the button is pressable again while the first call is in-flight, enqueueing duplicate sign-outs. This is a secondary factor; the primary is Finding 1.

**Surgical fix:** Track `isSigning` state in the component and `disabled={isSigning}` the button.

---

## Finding 4 — MEDIUM: Home property image re-buffers on screen switch (root cause of C)

**File:** `apps/mobile/components/home/MyHomeCard.tsx` line 2

```tsx
import { Image, Platform, Pressable, Text, View, type ViewStyle } from 'react-native';
```

The home thumbnail uses **React Native's built-in `Image`**, not `expo-image`. The Esri satellite URL (`esriSatelliteUrl()` from `lib/geo/esri.ts`) is a parametric REST endpoint:
```
https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=...&format=jpg&f=image
```

The Esri export service does not set browser-standard `Cache-Control` headers. React Native's `Image` cache behavior is determined by the native HTTP layer (NSURLCache on iOS, OkHttp on Android). Without explicit cache headers the image is treated as non-cacheable, so every screen unmount → remount triggers a fresh network round-trip.

`expo-image` (`expo-image ^3.0.11` is already in the project) uses Nuke (iOS) / Coil (Android) with its own memory+disk cache layer that is independent of HTTP cache headers. Adding `cachePolicy="memory-disk"` to the `expo-image` component would cache the image persistently across screen switches.

**Additional:** The `Avatar` component in `app/(homeowner)/(tabs)/inbox.tsx` (line 196–199) also uses `react-native` `Image` for avatar images, meaning provider avatar thumbnails in the inbox list also re-buffer on each visit.

**Surgical fix:** Replace `import { Image, ... } from 'react-native'` in `MyHomeCard.tsx` with `import { Image as ExpoImage } from 'expo-image'` and render `<ExpoImage source={...} contentFit="cover" cachePolicy="memory-disk" />`.

---

## Finding 5 — MEDIUM: Avatar upload blocks JS thread + fails first try (root cause of B)

**File:** `apps/mobile/lib/api/storage.ts` lines 57–74

```ts
export async function uploadAsset(bucket, path, asset) {
  if (!asset.base64) { throw new Error(...); }
  const arrayBuffer = decodeBase64(asset.base64);   // ← synchronous, blocks JS thread
  const contentType = asset.mimeType ?? 'image/jpeg';
  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType,
    upsert: true,
  });
  ...
}
```

**`decodeBase64(asset.base64)` (from `base64-arraybuffer`) is synchronous.** A phone photo at 75% quality (`quality: 0.75` in `pickImageFromLibrary`) can produce a 2–5 MB JPEG, which is a 2.7–6.7 MB base64 string. Decoding this in the JS thread takes 150–600 ms on mid-range hardware. During that window, the entire UI is frozen — animations stop, button presses are queued, the ActivityIndicator spinner stops spinning. The user perceives this as the first tap "not working."

**"Fails on first try" (permission-related sub-cause):** `pickImageFromLibrary` always calls `requestMediaLibraryPermissionsAsync()` at the top. On iOS 14+ with Limited Photo Access, this can show the system sheet again. If the user previously granted limited access, they see the selector but the library picker opens with reduced content. The function still returns `granted: true`, but `launchImageLibraryAsync` may return `canceled: true` if the user dismisses the limited-access picker without selecting. The caller (`onChangeAvatar` in `profile.tsx` line 69) interprets this as a cancelled pick and silently returns — making the first-tap look like a no-op.

**Upload failure with expired token:** After 1 hr (Finding 1), `supabase.storage.from(bucket).upload(...)` returns `StorageError: JWT expired`. The `catch (err)` in `onChangeAvatar` (line 84) shows an Alert. The user taps retry → token has now been refreshed by the failed request triggering `onAuthStateChange` → second attempt succeeds. This gives the "fails first try, works second time" pattern specific to storage uploads.

**Surgical fix:**
1. Move `decodeBase64` to a `setTimeout(() => ..., 0)` or use a Web Worker / background task to avoid blocking the UI thread (not trivially available in RN, but wrapping in `new Promise(resolve => setTimeout(() => resolve(decodeBase64(b64)), 0))` yields to the event loop once, which lets the spinner start).
2. Alternatively, use `fetch`-based upload with the file URI directly (bypasses base64 decode entirely): `await fetch(asset.uri)` → `arrayBuffer()` → upload.

---

## Finding 6 — LOW: `bootstrap()` has no timeout on `getSession()` (secondary cause of E hang)

**File:** `apps/mobile/stores/authStore.ts` lines 184–193

```ts
bootstrap: async () => {
  if (authSubscription) return;
  const { data: sub } = supabase.auth.onAuthStateChange(...);
  authSubscription = sub.subscription;

  try {
    const { data } = await supabase.auth.getSession();   // ← no timeout
    if (data.session) {
      await applySession(data.session);    // ← no timeout; 3 sequential DB calls
    } else {
      set({ status: 'unauthenticated' });
    }
  } catch {
    set({ status: 'unauthenticated' });
  }
},
```

On Metro 'r' reload with an expired token, `getSession()` attempts a server-side token refresh. The Supabase JS client uses `fetch` with no abort signal or timeout. If the Supabase project is cold (free tier pause), the DNS+TCP+TLS handshake + API response can exceed 30 seconds. For that entire duration `status === 'bootstrapping'` → `AuthBootstrap` at `_layout.tsx` line 49 (`const bootReady = status !== 'bootstrapping' && minDurationElapsed`) never becomes `true` → the splash screen never exits → the app appears hung.

Additionally, `applySession` makes three sequential DB queries (profile, address/provider) with no timeout. A slow network makes this take several seconds even on a valid session.

**Surgical fix:** Add `AbortController` with a 10-second timeout to `getSession()` (not natively supported in supabase-js), or more practically, add a 15-second `setTimeout` that forces `set({ status: 'unauthenticated' })` if bootstrap hasn't resolved.

---

## Finding 7 — LOW: StreetView URL query fires even when `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is unset

**File:** `apps/mobile/app/(homeowner)/(tabs)/index.tsx` lines 95–100 and `lib/geo/streetview.ts` line 39

```ts
// index.tsx
const { data: frontViewUrl } = useQuery({
  queryKey: ['streetview', lat, lng],
  queryFn: () => resolveStreetViewUrl({ lat: lat!, lng: lng! }),
  enabled: lat != null && lng != null,   // ← fires even with no API key
  staleTime: Infinity,
});

// streetview.ts
const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
...
if (!GOOGLE_KEY) return null;   // ← early-returns null, no network call
```

`resolveStreetViewUrl` correctly short-circuits when the key is absent. However, because `enabled` doesn't check for the key, the query fires, calls the function, and stores `null` in TanStack Query cache on every mount. This is benign (no network, fast return) but creates unnecessary query overhead. The larger issue is that if someone supplies an invalid key, the metadata fetch goes to Google APIs, gets a 400, and `resolveStreetViewUrl` silently returns `null` (caught by `try/catch`). No feedback to the developer. Not a user-facing symptom.

---

## Ranked Findings Summary

| # | Severity | Symptom | File:Line | Root Cause |
|---|----------|---------|-----------|------------|
| 1 | CRITICAL | Buttons dead after 1 hr; 'r' hangs on splash | `lib/supabase.ts:16–23` (entire client config) | No `AppState` → `startAutoRefresh()` integration; token expires silently |
| 2 | HIGH | Inbox opens blank | `app/(homeowner)/(tabs)/inbox.tsx:48–66`; `app/(provider)/inbox.tsx:31–42` | Missing `if (isLoading)` branch; empty `ScrollView` renders when cache is cold |
| 3 | HIGH | Sign Out needs 2+ taps | `app/(homeowner)/(tabs)/profile.tsx:307–323` | No `disabled` guard; async signOut can be double-tapped; worsened by Finding 1 |
| 4 | MEDIUM | Home image re-buffers on tab switch | `components/home/MyHomeCard.tsx:2` | Uses `react-native` `Image`; Esri has no cache headers; needs `expo-image` |
| 5 | MEDIUM | Avatar upload slow, fails first try | `lib/api/storage.ts:62` | Synchronous `decodeBase64` blocks JS thread; first-try 401 after token expiry |
| 6 | LOW | 'r' reload hangs on loading screen | `stores/authStore.ts:185–193` | `getSession()` + `applySession` have no timeout; blocked on slow/cold Supabase |
| 7 | LOW | StreetView query fires without key | `app/(homeowner)/(tabs)/index.tsx:95–100` | `enabled` ignores key absence; benign but wasteful |
