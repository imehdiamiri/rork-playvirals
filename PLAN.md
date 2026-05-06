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

## Validation
- [x] runChecks passes after Phase 7 / 8 / 9 changes.

## Follow-ups (next sessions)
- Phase 2 — admin website migration to Firebase Admin SDK (still on Supabase).
- Phase 7 — animation engine consolidation (`Animated` → Reanimated), low-end Android profiling, lazy-load card decks behind `React.lazy` on the cards route.
- Phase 8 — extract a shared `RoundHeader` and `SetupCard` primitive once 2+ games actually need them.
- Set RC server secret: `firebase functions:secrets:set REVENUECAT_SECRET` and deploy updated `database.rules.json` (`firebase deploy --only database`).
