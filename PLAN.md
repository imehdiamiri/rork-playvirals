# PartyBot — Production Stabilization (Phases 1, 3, 5)

## Phase 1 — Cleanup
- [x] Delete Expo template leftovers in `expo/components/` (themed-text, themed-view, parallax-scroll-view, hello-wave, external-link, haptic-tab, ui/collapsible)
- [x] Delete `expo/scripts/reset-project.js`
- [x] Delete unused `expo/src/components/GameCardView.tsx` (duplicate, not imported anywhere)

## Phase 3 — Security
- [x] Remove hardcoded Firebase config fallback from `expo/src/lib/firebase.ts`
- [x] Remove `EXPO_PUBLIC_GEMINI_API_KEY` from client; refactor `LLMService` to call Firebase Cloud Function `generateCard`
- [x] Add Cloud Function source at `functions/index.js` (deploy with `firebase deploy --only functions`)
- [x] Add `database.rules.json` (RTDB) and `firestore.rules` with per-user write protection on wallet/users/friendships/rooms

## Phase 5 — Player model unification
- [x] Create canonical `Player` type at `expo/src/models/Player.ts`
- [x] Migrate `useGameStore.PlayerProfile` to alias canonical `Player` (`displayName`)
- [x] Migrate `MultiplayerService.MultiplayerPlayer` to canonical shape
- [x] Update game session components to use `displayName`

## Validation
- [x] runChecks passes

## Phase 4 — Economy / Paywall Unification
- [x] Single source of truth: `useEconomyStore` listens live to `users/$uid` (wallet + isPremium + isLifetime). Client never writes — RTDB rules forbid it.
- [x] All wallet mutations go through Cloud Functions: `claimDailyReward` (transactional, once-per-day) and `syncRevenueCat` (server fetches RC subscriber state, mirrors entitlement, idempotently credits star packs via `processedTransactions`).
- [x] `usePaywallStore` reduced to a thin storefront: configures RC with the Firebase uid, listens for `customerInfoUpdate`, and after every configure/purchase/restore calls `syncEntitlement()` which invokes `syncRevenueCat`.
- [x] Removed split-brain `isPremium`/`stars` from paywall store. Profile, paywall and game-detail all read entitlement from `useEconomyStore`.
- [x] `aiCardCost(isPremium)` helper exported from `useEconomyStore` and `AICardGenerator` (1★ premium / 5★ free).
- [x] `_layout.tsx` bridges Firebase auth → `economy.attach` + `paywall.configure` on uid change; detaches on sign-out. Registered `paywall` as a modal screen.
- [x] RTDB rules harden `users/$uid/{isLifetime,entitlementUpdatedAt,processedTransactions}` against client writes.

## Phase 6 — Multiplayer hardening (Memory Grid, Guess the Seconds, Pass & Guess)
- [x] `GameSyncService` rewritten with monotonic `version` per broadcast, stale-snapshot filter, action push-key de-dup (`ackAction`), `getSnapshot()` for reconnects, and 5s presence heartbeat with 12s staleness window.
- [x] `useGameSync` switched from timestamp watermark to action-key set so the host never re-processes the same action twice (even after reconnect). Clients now pull a one-shot snapshot on mount.
- [x] `database.rules.json` allows host-only writes to `rooms/$code/gameState`, per-player writes to `actions/$key` and `presence/$pid`.
- [x] `useMultiplayerStore.leaveRoom` now stops the heartbeat before tearing the room down.

## Phase 9 — Storefront wiring
- [x] `purchase-detail.tsx` now reads `identifier` from route params, resolves the live `PurchasesPackage` from `usePaywallStore`, classifies it (subscription / lifetime / star pack / donation) and calls `purchasePackage`. Falls back to a clean loading state when offerings are not yet hydrated.
- [x] `profile.tsx` plan and star-pack rows are driven by `getSubscriptionPackages()`, `getLifetimePackage()` and `getStarPackages()`. Tapping a row deep-links into `/purchase-detail` with the identifier.

## Phase 10 — Production polish
- [x] `RootErrorBoundary` mounted at the top of `_layout.tsx` so a single render exception cannot brick the app; offers a recover-to-tree button.

## Validation
- [x] runChecks passes after Phase 6 / 9 / 10 changes.

## Phase 6 — Multiplayer wiring (continued)
- [x] `GuessTheSecondsSession` rewritten as a single sync object driven through `useGameSync`. Host owns the reducer (`setTarget`/`start`/`stop`/`continue`/`playAgain`); clients dispatch via `sendAction`. `startedAt` is broadcast as an epoch ms so each device computes its own smooth `elapsedTime` locally without re-broadcasting every tick. Non-active players see a "Waiting for X…" hint and have controls disabled.
- [x] `Pass & Guess` left as **single-device by design** — the entire game loop is built around privacy screens and physically passing one phone, so multi-device mode is intentionally not in `supportedModes`. Documented here so future contributors don't try to wire it.

## Phase 8 — Reusable primitives
- [x] Added `expo/src/components/games/ResultsScoreboard.tsx` — shared sorted ranking with winner highlight, used by Pass & Guess final screen.
- [x] Migrated `MemoryGridSession` final ranking card to `ResultsScoreboard` (time + move count). Removed ~20 lines of duplicated rank-row styles.
- [x] Migrated `GuessTheSecondsSession` final ranking card to `ResultsScoreboard` (total + avg). Removed ~18 lines of duplicated styles.

## Phase 9 — Lobby / Team Setup / Friends finishing pass
- [x] `lobby/[roomCode].tsx` — wired the previously-decorative Share button to `Share.share` with the room code, wired the Remove button to `multiplayerService.leaveRoom(roomCode, playerId)` behind a confirmation alert, and fixed `player.name` → `player.displayName` (was rendering `undefined` after the Player model unification).
- [x] `team-setup.tsx` — `handleStart` now actually calls `useMultiplayerStore.startGame()` and navigates to `/game/[id]/session`. Player name read fixed to `displayName`.
- [x] `(tabs)/friends.tsx` — "Invite" pill on online friends now triggers `Share.share` instead of being a dead button.

## Phase 7 — Performance (incremental)
- [x] `CardsDeckRenderer` — built a one-time `CARDS_BY_CATEGORY` index (888 cards) at module load so category filter changes no longer re-scan the whole deck. Memoized `categoryCards`/`availableSubtypes` so subtype/spicy toggles only re-filter the per-category slice.
- [x] `cards/[categoryId].tsx` — lazy-load `CardsDeckRenderer` via `React.lazy` + `Suspense` so the 888-card deck module is only parsed when a deck is actually opened (not on first tab render).

## Validation
- [x] runChecks passes after Phase 7 / 8 / 9 changes.

## Phase 2 — Admin website migrated to Firebase Admin SDK
- [x] Removed `@supabase/ssr` and `@supabase/supabase-js`; deleted `website/lib/supabase{,-server}.ts`.
- [x] Added `website/lib/firebase-admin.ts` (cert-based Admin SDK init + `isAdminUid` helper that reads the `admin` custom claim) and `website/lib/firebase-client.ts` (Web SDK for the login form).
- [x] Auth flow: login page signs in with Firebase Web SDK and `POST /api/admin/session` exchanges the ID token for an HttpOnly session cookie via `createSessionCookie`. `requireAdmin()` verifies the cookie + `admin` claim on every server render. `middleware.ts` does a cheap cookie-presence redirect (Edge runtime can't load Admin SDK).
- [x] Rewrote every admin page (`page.tsx` for dashboard, users, user detail, ai-logs, analytics, announcements, audit, content, ui, invites) on top of `website/lib/data.ts` which reads directly from RTDB (`users/`, `aiUsage/`, `appConfig/`, `uiConfig/`, `announcements/`, `adminAuditLog/`).
- [x] All client-side mutations replaced with Next.js server actions in `website/lib/actions.ts` (`adjustStars`, `setSubscription`, `setBan`, `toggleUnlock`, `setConfig`, `deleteConfig`, `createAnnouncement`, `toggleAnnouncement`, `signOut`). Each action goes through `requireAdmin()`, mutates RTDB, writes an `adminAuditLog` row, and `revalidatePath`s.
- [x] Banning a user now also calls `adminAuth().revokeRefreshTokens(uid)` so they're forced out of any open session.
- [x] Updated `.env.example` (Firebase web config + `FIREBASE_SERVICE_ACCOUNT` + `FIREBASE_DATABASE_URL` + `ADMIN_SESSION_SECRET`) and rewrote `README.md` with the Firebase setup + RTDB schema.
- [x] `bun run build` passes (Next.js 15, all 13 admin routes compile).

## Phase 7 — Animation engine consolidation
- [x] Migrated all remaining JS-thread `Animated` usages in game components to Reanimated 4 shared values + `useAnimatedStyle` so animations run on the UI thread (no JS-thread interpolation).
  - `PhaseTransition` (generic enter helper) — `withTiming` / `withSpring`.
  - `FirstTimeHintOverlay` — modal scale + opacity via shared values, `runOnJS` for AsyncStorage finalizer.
  - `MemoryPathSession` — wrong-tile shake via `withSequence(withTiming...)`.
  - `SpinBottleSession` — bottle rotation via `withTiming` + `Easing.out(cubic)`, `runOnJS` callback for landed phase.
  - `MemoryGridSession.FlipTile` — 3D flip front/back via `interpolate` on a shared value.
- [x] runChecks passes after Phase 7 migration.

## Follow-ups (next sessions)
- Phase 8 — extract a shared `RoundHeader` and `SetupCard` primitive once 2+ games actually need them.
- Set RC server secret: `firebase functions:secrets:set REVENUECAT_SECRET` and deploy updated `database.rules.json` (`firebase deploy --only database`).
- Bootstrap the first admin: `admin.auth().setCustomUserClaims(uid, { admin: true })` (one-time, from any environment with the service account).

## Launch Stabilization (TestFlight readiness)

### Phase L1 — Removed leaked / dead env systems
- [x] Dropped the `Gemini` block (and the `EXPO_PUBLIC_GEMINI_API_KEY` reference) from `expo/src/constants/AppConstants.ts`. The Gemini key now lives only in the `generateCard` Cloud Function secret; nothing in the client bundle reads it.
- [x] Removed the hardcoded Firebase project fallback (`partyplay-8`) from `AppConstants.ts`. Firebase config is read exclusively in `expo/src/lib/firebase.ts` from `EXPO_PUBLIC_FIREBASE_*`.
- [x] No `EXPO_PUBLIC_SUPABASE_*` references remain in `expo/`.

### Phase L2 — Multiplayer truthfulness
- [x] `expo/src/models/AppModels.ts` `supportedModes` now reflects what is actually wired:
  - `memoryGrid`: `[singleDevice, multiDevice]` (removed bogus `teamMode`).
  - `guessTheSeconds`: `[singleDevice, multiDevice]` (real multiplayer was already implemented through `useGameSync`; previously hidden behind UI).
  - `memoryPath` / `tapInOrder` / `colorTrap` / `drawRush`: collapsed to `[singleDevice]` until real sync ships.
  - `passGuess`: stays `[singleDevice]` by design.
- Result: no game opens a fake multiplayer lobby anymore.

### Phase L3 — Room stability + host migration
- [x] Rewrote `expo/src/services/MultiplayerService.ts`:
  - Removed the destructive `onDisconnect(roomRef).remove()`. The host's brief disconnect no longer kills the room.
  - `onDisconnect` is scoped to the host's player row only; remaining players can wait or promote.
  - Every mutation bumps `lastActivityAt` so the new sweeper can TTL silent rooms.
  - Added `claimHost(roomCode)`: lowest `joinedAt` remaining player can promote itself when the previous `hostId` is no longer in `players` (rules-enforced).
  - `closeRoom` now flags `status: 'closed'` instead of an immediate delete; the sweeper GCs the node within 5 minutes.
- [x] Added `sweepStaleRooms` scheduled Cloud Function (every 10 min) with TTLs: 30 min waiting, 6h playing, 5 min closed.
- [x] `useMultiplayerStore` now reflects `hostId` changes from the live snapshot and triggers `maybeClaimHost` whenever room/presence updates land.

### Phase L4 — Player identity = `auth.uid`
- [x] Removed the `user_${random}` ids in `useMultiplayerStore`. Both `createRoom` and `joinRoom` now use `auth.currentUser.uid` (anonymous sign-in still gives guests a stable uid).
- [x] `players/$pid` writes now satisfy `auth.uid == $pid`, which the new RTDB rules enforce.
- [x] Player records carry `joinedAt` (used for deterministic host migration ordering).

### Phase L5 — Hardened Firebase rules (`database.rules.json`)
- [x] `friendRequests`: globally readable index removed. Only the `to`/`from` participants can read or mutate a request. `fromUserId` is locked to the writer on create.
- [x] `friendships`: per-edge rule — `friendships/$uid/$friendUid` only writeable by either side of the friendship.
- [x] `users/$uid`: `inviteStats`, `invitedBy`, `inviteCode` are server-only; client-writeable fields are length-validated.
- [x] `rooms/$code`:
  - Code path constrained to `^[0-9]{6}# PartyBot — Production Stabilization (Phases 1, 3, 5)

## Phase 1 — Cleanup
- [x] Delete Expo template leftovers in `expo/components/` (themed-text, themed-view, parallax-scroll-view, hello-wave, external-link, haptic-tab, ui/collapsible)
- [x] Delete `expo/scripts/reset-project.js`
- [x] Delete unused `expo/src/components/GameCardView.tsx` (duplicate, not imported anywhere)

## Phase 3 — Security
- [x] Remove hardcoded Firebase config fallback from `expo/src/lib/firebase.ts`
- [x] Remove `EXPO_PUBLIC_GEMINI_API_KEY` from client; refactor `LLMService` to call Firebase Cloud Function `generateCard`
- [x] Add Cloud Function source at `functions/index.js` (deploy with `firebase deploy --only functions`)
- [x] Add `database.rules.json` (RTDB) and `firestore.rules` with per-user write protection on wallet/users/friendships/rooms

## Phase 5 — Player model unification
- [x] Create canonical `Player` type at `expo/src/models/Player.ts`
- [x] Migrate `useGameStore.PlayerProfile` to alias canonical `Player` (`displayName`)
- [x] Migrate `MultiplayerService.MultiplayerPlayer` to canonical shape
- [x] Update game session components to use `displayName`

## Validation
- [x] runChecks passes

## Phase 4 — Economy / Paywall Unification
- [x] Single source of truth: `useEconomyStore` listens live to `users/$uid` (wallet + isPremium + isLifetime). Client never writes — RTDB rules forbid it.
- [x] All wallet mutations go through Cloud Functions: `claimDailyReward` (transactional, once-per-day) and `syncRevenueCat` (server fetches RC subscriber state, mirrors entitlement, idempotently credits star packs via `processedTransactions`).
- [x] `usePaywallStore` reduced to a thin storefront: configures RC with the Firebase uid, listens for `customerInfoUpdate`, and after every configure/purchase/restore calls `syncEntitlement()` which invokes `syncRevenueCat`.
- [x] Removed split-brain `isPremium`/`stars` from paywall store. Profile, paywall and game-detail all read entitlement from `useEconomyStore`.
- [x] `aiCardCost(isPremium)` helper exported from `useEconomyStore` and `AICardGenerator` (1★ premium / 5★ free).
- [x] `_layout.tsx` bridges Firebase auth → `economy.attach` + `paywall.configure` on uid change; detaches on sign-out. Registered `paywall` as a modal screen.
- [x] RTDB rules harden `users/$uid/{isLifetime,entitlementUpdatedAt,processedTransactions}` against client writes.

## Phase 6 — Multiplayer hardening (Memory Grid, Guess the Seconds, Pass & Guess)
- [x] `GameSyncService` rewritten with monotonic `version` per broadcast, stale-snapshot filter, action push-key de-dup (`ackAction`), `getSnapshot()` for reconnects, and 5s presence heartbeat with 12s staleness window.
- [x] `useGameSync` switched from timestamp watermark to action-key set so the host never re-processes the same action twice (even after reconnect). Clients now pull a one-shot snapshot on mount.
- [x] `database.rules.json` allows host-only writes to `rooms/$code/gameState`, per-player writes to `actions/$key` and `presence/$pid`.
- [x] `useMultiplayerStore.leaveRoom` now stops the heartbeat before tearing the room down.

## Phase 9 — Storefront wiring
- [x] `purchase-detail.tsx` now reads `identifier` from route params, resolves the live `PurchasesPackage` from `usePaywallStore`, classifies it (subscription / lifetime / star pack / donation) and calls `purchasePackage`. Falls back to a clean loading state when offerings are not yet hydrated.
- [x] `profile.tsx` plan and star-pack rows are driven by `getSubscriptionPackages()`, `getLifetimePackage()` and `getStarPackages()`. Tapping a row deep-links into `/purchase-detail` with the identifier.

## Phase 10 — Production polish
- [x] `RootErrorBoundary` mounted at the top of `_layout.tsx` so a single render exception cannot brick the app; offers a recover-to-tree button.

## Validation
- [x] runChecks passes after Phase 6 / 9 / 10 changes.

## Phase 6 — Multiplayer wiring (continued)
- [x] `GuessTheSecondsSession` rewritten as a single sync object driven through `useGameSync`. Host owns the reducer (`setTarget`/`start`/`stop`/`continue`/`playAgain`); clients dispatch via `sendAction`. `startedAt` is broadcast as an epoch ms so each device computes its own smooth `elapsedTime` locally without re-broadcasting every tick. Non-active players see a "Waiting for X…" hint and have controls disabled.
- [x] `Pass & Guess` left as **single-device by design** — the entire game loop is built around privacy screens and physically passing one phone, so multi-device mode is intentionally not in `supportedModes`. Documented here so future contributors don't try to wire it.

## Phase 8 — Reusable primitives
- [x] Added `expo/src/components/games/ResultsScoreboard.tsx` — shared sorted ranking with winner highlight, used by Pass & Guess final screen.
- [x] Migrated `MemoryGridSession` final ranking card to `ResultsScoreboard` (time + move count). Removed ~20 lines of duplicated rank-row styles.
- [x] Migrated `GuessTheSecondsSession` final ranking card to `ResultsScoreboard` (total + avg). Removed ~18 lines of duplicated styles.

## Phase 9 — Lobby / Team Setup / Friends finishing pass
- [x] `lobby/[roomCode].tsx` — wired the previously-decorative Share button to `Share.share` with the room code, wired the Remove button to `multiplayerService.leaveRoom(roomCode, playerId)` behind a confirmation alert, and fixed `player.name` → `player.displayName` (was rendering `undefined` after the Player model unification).
- [x] `team-setup.tsx` — `handleStart` now actually calls `useMultiplayerStore.startGame()` and navigates to `/game/[id]/session`. Player name read fixed to `displayName`.
- [x] `(tabs)/friends.tsx` — "Invite" pill on online friends now triggers `Share.share` instead of being a dead button.

## Phase 7 — Performance (incremental)
- [x] `CardsDeckRenderer` — built a one-time `CARDS_BY_CATEGORY` index (888 cards) at module load so category filter changes no longer re-scan the whole deck. Memoized `categoryCards`/`availableSubtypes` so subtype/spicy toggles only re-filter the per-category slice.
- [x] `cards/[categoryId].tsx` — lazy-load `CardsDeckRenderer` via `React.lazy` + `Suspense` so the 888-card deck module is only parsed when a deck is actually opened (not on first tab render).

## Validation
- [x] runChecks passes after Phase 7 / 8 / 9 changes.

## Phase 2 — Admin website migrated to Firebase Admin SDK
- [x] Removed `@supabase/ssr` and `@supabase/supabase-js`; deleted `website/lib/supabase{,-server}.ts`.
- [x] Added `website/lib/firebase-admin.ts` (cert-based Admin SDK init + `isAdminUid` helper that reads the `admin` custom claim) and `website/lib/firebase-client.ts` (Web SDK for the login form).
- [x] Auth flow: login page signs in with Firebase Web SDK and `POST /api/admin/session` exchanges the ID token for an HttpOnly session cookie via `createSessionCookie`. `requireAdmin()` verifies the cookie + `admin` claim on every server render. `middleware.ts` does a cheap cookie-presence redirect (Edge runtime can't load Admin SDK).
- [x] Rewrote every admin page (`page.tsx` for dashboard, users, user detail, ai-logs, analytics, announcements, audit, content, ui, invites) on top of `website/lib/data.ts` which reads directly from RTDB (`users/`, `aiUsage/`, `appConfig/`, `uiConfig/`, `announcements/`, `adminAuditLog/`).
- [x] All client-side mutations replaced with Next.js server actions in `website/lib/actions.ts` (`adjustStars`, `setSubscription`, `setBan`, `toggleUnlock`, `setConfig`, `deleteConfig`, `createAnnouncement`, `toggleAnnouncement`, `signOut`). Each action goes through `requireAdmin()`, mutates RTDB, writes an `adminAuditLog` row, and `revalidatePath`s.
- [x] Banning a user now also calls `adminAuth().revokeRefreshTokens(uid)` so they're forced out of any open session.
- [x] Updated `.env.example` (Firebase web config + `FIREBASE_SERVICE_ACCOUNT` + `FIREBASE_DATABASE_URL` + `ADMIN_SESSION_SECRET`) and rewrote `README.md` with the Firebase setup + RTDB schema.
- [x] `bun run build` passes (Next.js 15, all 13 admin routes compile).

## Phase 7 — Animation engine consolidation
- [x] Migrated all remaining JS-thread `Animated` usages in game components to Reanimated 4 shared values + `useAnimatedStyle` so animations run on the UI thread (no JS-thread interpolation).
  - `PhaseTransition` (generic enter helper) — `withTiming` / `withSpring`.
  - `FirstTimeHintOverlay` — modal scale + opacity via shared values, `runOnJS` for AsyncStorage finalizer.
  - `MemoryPathSession` — wrong-tile shake via `withSequence(withTiming...)`.
  - `SpinBottleSession` — bottle rotation via `withTiming` + `Easing.out(cubic)`, `runOnJS` callback for landed phase.
  - `MemoryGridSession.FlipTile` — 3D flip front/back via `interpolate` on a shared value.
- [x] runChecks passes after Phase 7 migration.

.
  - Room update permitted to host OR a host-migration claim (only when the previous host is gone).
  - `gameState.version` enforced as monotonically increasing.
  - `players/$pid.id` validated against `$pid`; `displayName` length-bounded.
  - `actions/$key.playerId` must equal `auth.uid`; `type` length-bounded; `ts` required-numeric.
- [x] `telemetry`: per-event payload bounded (event name length, owner check); read denied to clients.
- [x] `appConfig` / `uiConfig` / `announcements` are read-only to clients; `adminAuditLog` is fully closed.

### Phase L6 — Server-authoritative invites
- [x] New Cloud Functions in `functions/index.js`:
  - `ensureInviteCode` — lazy-mints the user's invite code (server is the only writer).
  - `redeemInvite` — transactional, idempotent (`users/$uid/invitedBy` is the gate), credits inviter (+30★) and invitee (+10★), bumps `inviteStats`, blocks self-referral.
- [x] `expo/src/services/InviteService.ts` rewritten as a thin client wrapper around the new functions; all client-side wallet writes deleted.
- [x] `expo/src/store/useFriendsStore.ts.redeemInviteCode/generateInviteCode` now call the Cloud Functions (no more direct RTDB scans / wallet math).

### Phase L7 / L8 — Multiplayer infra + abuse hardening
- [x] Rules now reject malformed actions (oversize `type`, foreign `playerId`, missing `ts`).
- [x] Action queue still drained by the host with action-key de-dup (existing `useGameSync` set).
- [x] Telemetry size guarded; sweeper prevents unbounded room accumulation.

### Phase L9 — Cleanup of orphan systems
- [x] Deleted `expo/src/services/SessionResilienceService.ts`, `MultiplayerTelemetry.ts`, `NotificationService.ts`, and `expo/src/utils/DeviceIdentity.ts` (only used by the deleted telemetry service and a now-removed `_layout.tsx` warm call).
- [x] `_layout.tsx` no longer imports `DeviceIdentity`.

### Phase L10 — Launch readiness
- [x] `RootErrorBoundary` already at the root; combined with the closed/expired room handling in `useMultiplayerStore` peers exit gracefully when sessions die.
- [x] No misleading multiplayer entry points remain (Phase L2). No leaked secrets (Phase L1). No client-trusted wallet writes (Phase L6).
- [x] User-facing reconnect / host-migration UX:
  - `useMultiplayerStore` watches `.info/connected` and exposes `connectionState`. Drops emit a "Reconnecting to room…" toast; recovery emits "Back online".
  - Host migration is announced via a toast (`<player> is the new host` / `You are now the host`) keyed off `previousHostId` transitions in the live snapshot.
  - New `expo/src/components/MultiplayerStatusBanner.tsx` — slim animated pill mounted in `lobby/[roomCode].tsx` and `game/[id]/session.tsx`. Shows during reconnects only and explains who players are waiting on.

### Deploy checklist (operator)
1. `firebase deploy --only functions` — picks up `redeemInvite`, `ensureInviteCode`, `sweepStaleRooms` and the tightened `generateCard` payload guard.
2. `firebase deploy --only database` — ships the new RTDB rules (required, otherwise the new rules-aware code paths will reject writes).
3. `firebase functions:secrets:set GEMINI_API_KEY` (if not set).
4. `firebase functions:secrets:set REVENUECAT_SECRET` (if not set).
5. Verify the `users` index includes `usernameLower` and `inviteCode` (already declared in the new rules).

### TestFlight / beta readiness verdict
- TestFlight: **safe**. No leaked secrets, no fake multiplayer flows, no client-trusted economy, room sessions survive brief disconnects.
- Open beta: **safe** for an invite-list cohort. Watch the sweeper logs and `aiUsage` quotas before opening to public.
- Soft launch / paid acquisition: host-migration UX banner now shipped (Phase L10). Remaining gating items before paid acquisition are observability (sweeper success metrics, host-migration counters) and a moderation queue for AI-generated cards.
