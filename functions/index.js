/**
 * Firebase Cloud Functions — PartyBot secure backend layer.
 *
 * Functions:
 *   - generateCard:  Proxy to Gemini for AI card generation. Holds the key,
 *                    enforces rate limiting, and runs server-side moderation.
 *   - searchUsers:   Indexed prefix search over usernames (RTDB).
 *
 * Deploy:
 *   firebase deploy --only functions
 *
 * Set the Gemini key (one-time):
 *   firebase functions:secrets:set GEMINI_API_KEY
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const REVENUECAT_SECRET = defineSecret('REVENUECAT_SECRET');
const GEMINI_MODEL = 'gemini-2.0-flash';
const FREE_DAILY_LIMIT = 5;
const DAILY_REWARD = 5;

// Star pack catalogue — keep in sync with App Store Connect / Play Console / RC.
// productId → stars granted.
const STAR_PACKS = {
  stars_50: 50,
  stars_200: 200,
  stars_400: 400,
  stars_1000: 1000,
};

const PREMIUM_ENTITLEMENT = 'Premium';
const LIFETIME_PRODUCT_IDS = ['lifetime', 'partybot_lifetime'];

// ──────────────────────── Moderation ────────────────────────

const UNSAFE_PATTERNS = [
  /\b(kill|murder|suicide|rape|assault|weapon|gun|knife|bomb|drugs?|cocaine|heroin|meth)\b/i,
  /\b(racist|sexist|homophobic|slur|hate\s*speech)\b/i,
  /\b(child|minor|underage)\b/i,
  /\b(nazi|terrorist|extremist)\b/i,
];

const isSafe = (text) => !UNSAFE_PATTERNS.some((p) => p.test(text));

// ──────────────────────── Rate Limit ────────────────────────

async function bumpAndCheckUsage(uid, isPremium) {
  if (isPremium) return;
  const today = new Date().toISOString().split('T')[0];
  const ref = admin.database().ref(`aiUsage/${uid}/${today}`);
  const snap = await ref.transaction((v) => (v || 0) + 1);
  const used = snap.snapshot.val() || 0;
  if (used > FREE_DAILY_LIMIT) {
    throw new HttpsError(
      'resource-exhausted',
      `Daily limit reached (${FREE_DAILY_LIMIT} cards). Upgrade to Premium for unlimited.`
    );
  }
}

// ──────────────────────── generateCard ────────────────────────

exports.generateCard = onCall(
  { secrets: [GEMINI_API_KEY], cors: true },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

    const { system, user } = request.data || {};
    if (typeof system !== 'string' || typeof user !== 'string') {
      throw new HttpsError('invalid-argument', 'system and user prompts are required.');
    }
    if (!isSafe(user)) {
      throw new HttpsError('failed-precondition', 'Prompt failed moderation.');
    }

    // Check premium entitlement to bypass rate limit
    const userSnap = await admin.database().ref(`users/${uid}`).once('value');
    const isPremium = !!userSnap.val()?.isPremium;
    await bumpAndCheckUsage(uid, isPremium);

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY.value()}`;
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 256 },
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error('Gemini error', resp.status, body);
      throw new HttpsError('internal', `Gemini request failed (${resp.status})`);
    }

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new HttpsError('internal', 'Empty Gemini response');

    if (!isSafe(text)) {
      throw new HttpsError('failed-precondition', 'Generated content failed moderation.');
    }

    return { text };
  }
);

// ──────────────────────── claimDailyReward ────────────────────────

exports.claimDailyReward = onCall({ cors: true }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

  const today = new Date().toISOString().split('T')[0];
  const walletRef = admin.database().ref(`users/${uid}/wallet`);

  const result = await walletRef.transaction((current) => {
    const wallet = current || { balance: 0, lastDailyClaim: null, updatedAt: 0 };
    if (wallet.lastDailyClaim === today) {
      // Signal no-op via abort — we still want to surface the state.
      return; // abort transaction
    }
    wallet.balance = (wallet.balance || 0) + DAILY_REWARD;
    wallet.lastDailyClaim = today;
    wallet.updatedAt = Date.now();
    return wallet;
  });

  if (!result.committed) {
    throw new HttpsError('failed-precondition', 'Already claimed today.');
  }

  return {
    granted: DAILY_REWARD,
    balance: result.snapshot.val()?.balance || 0,
    lastDailyClaim: today,
  };
});

// ──────────────────────── syncRevenueCat ────────────────────────

/**
 * Pull the authoritative subscriber state from RevenueCat using the server
 * secret, then mirror it onto users/$uid: isPremium, isLifetime, and credit
 * any newly delivered star packs into wallet.balance. Idempotent via
 * users/$uid/processedTransactions/{transactionId}.
 */
exports.syncRevenueCat = onCall(
  { secrets: [REVENUECAT_SECRET], cors: true },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

    const secret = REVENUECAT_SECRET.value();
    if (!secret) {
      // No RC secret configured — leave entitlements as-is. This keeps dev
      // builds (no IAP) functional without throwing on every paywall mount.
      return { isPremium: false, isLifetime: false, credited: 0, skipped: true };
    }

    const resp = await fetch(`https://api.revenuecat.com/v1/subscribers/${uid}`, {
      headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' },
    });
    if (!resp.ok) {
      const body = await resp.text();
      console.error('RC fetch failed', resp.status, body);
      throw new HttpsError('internal', `RevenueCat sync failed (${resp.status})`);
    }

    const data = await resp.json();
    const subscriber = data.subscriber || {};
    const entitlements = subscriber.entitlements || {};
    const nonSubs = subscriber.non_subscriptions || {};

    const now = Date.now();
    const premiumEnt = entitlements[PREMIUM_ENTITLEMENT];
    const expiresMs = premiumEnt?.expires_date
      ? Date.parse(premiumEnt.expires_date)
      : null;
    const isPremium = !!premiumEnt && (expiresMs === null || expiresMs > now);
    const isLifetime =
      !!premiumEnt && expiresMs === null
        ? true
        : Object.keys(nonSubs).some((pid) => LIFETIME_PRODUCT_IDS.includes(pid));

    // Idempotent star pack delivery.
    const processedRef = admin.database().ref(`users/${uid}/processedTransactions`);
    const processedSnap = await processedRef.once('value');
    const processed = processedSnap.val() || {};

    let credited = 0;
    const updates = {};
    for (const [pid, items] of Object.entries(nonSubs)) {
      const stars = STAR_PACKS[pid];
      if (!stars || !Array.isArray(items)) continue;
      for (const item of items) {
        const txid = item.id || item.store_transaction_id;
        if (!txid || processed[txid]) continue;
        credited += stars;
        updates[txid] = { productId: pid, stars, at: now };
      }
    }

    if (credited > 0) {
      const walletRef = admin.database().ref(`users/${uid}/wallet`);
      await walletRef.transaction((current) => {
        const wallet = current || { balance: 0, updatedAt: 0 };
        wallet.balance = (wallet.balance || 0) + credited;
        wallet.updatedAt = now;
        return wallet;
      });
      await processedRef.update(updates);
    }

    await admin.database().ref(`users/${uid}`).update({
      isPremium,
      isLifetime,
      entitlementUpdatedAt: now,
    });

    return { isPremium, isLifetime, credited };
  }
);

// ──────────────────────── searchUsers ────────────────────────

exports.searchUsers = onCall({ cors: true }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');

  const query = String(request.data?.query || '').trim().toLowerCase();
  if (query.length < 2) return { results: [] };

  // Prefix search via usernameLower index. Requires:
  //   "users": { ".indexOn": ["usernameLower"] }   (in database.rules.json)
  const snap = await admin
    .database()
    .ref('users')
    .orderByChild('usernameLower')
    .startAt(query)
    .endAt(query + '\uf8ff')
    .limitToFirst(20)
    .once('value');

  const results = [];
  snap.forEach((child) => {
    if (child.key === uid) return;
    const v = child.val() || {};
    results.push({
      id: child.key,
      username: v.username || '',
      email: v.email || undefined,
      avatarURL: v.avatarURL || undefined,
    });
  });
  return { results };
});
