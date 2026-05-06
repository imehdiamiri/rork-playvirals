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

## Follow-ups (next sessions)
- Phase 2 — admin website migration to Firebase Admin SDK
- Phase 6 — multiplayer rebuild (Memory Grid, Guess the Seconds, Pass & Guess)
- Phase 7–10 — perf, UI consolidation, team mode, production polish
- Set RC server secret: `firebase functions:secrets:set REVENUECAT_SECRET`
- Wire `purchase-detail.tsx` to a real package via route params (currently hardcoded yearly placeholder)
- Replace hardcoded plan/star tiles in `profile.tsx` with live RC offerings
