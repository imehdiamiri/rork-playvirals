/**
 * Firebase — Complete configuration for PlayVirals
 *
 * Services initialized:
 *  - Auth (with AsyncStorage persistence for RN)
 *  - Firestore (user profiles, game history)
 *  - Realtime Database (live sessions, lobbies, economy)
 *  - Storage (user avatars, generated content)
 *
 * Config is read from EXPO_PUBLIC_ env vars (set in .env).
 * Falls back to hardcoded defaults for development convenience.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
// @ts-ignore: getReactNativePersistence is valid at runtime in RN context
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getDatabase, Database, ref, set as fbSet } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Configuration ───

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            || 'AIzaSyAs2iX3l4sqg1F5QTMdNv0kx4z1H8hOqCU',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        || 'partyplay-8.firebaseapp.com',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         || 'partyplay-8',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     || 'partyplay-8.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1003126250476',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             || '1:1003126250476:web:6914df967838f18ffa7ec9',
  databaseURL:       process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL       || 'https://partyplay-8-default-rtdb.firebaseio.com',
};

// ─── App ───

const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

// ─── Auth ───
// On native (iOS/Android) we use AsyncStorage persistence.
// On web, Firebase handles persistence automatically via indexedDB.

let auth: Auth;
try {
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} catch (error: any) {
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    throw error;
  }
}

// ─── Firestore (user profiles, game history, ideas) ───

const db: Firestore = getFirestore(app);

// ─── Realtime Database (live game sessions, lobbies, presence, economy) ───

const rtdb: Database = getDatabase(app);

// ─── Storage (avatars, generated content) ───

const storage: FirebaseStorage = getStorage(app);

// ─── User Profile Sync ───
// Call this after sign-in / sign-up to ensure user data exists in RTDB + Firestore.

interface UserProfileData {
  uid: string;
  username: string;
  email?: string;
  provider: string;
  avatarURL?: string;
}

async function syncUserProfile(data: UserProfileData): Promise<void> {
  try {
    const now = Date.now();

    // Write to RTDB (for realtime lookups: friend search, presence, economy)
    const rtdbUserRef = ref(rtdb, `users/${data.uid}`);
    await fbSet(rtdbUserRef, {
      username: data.username,
      email: data.email || null,
      provider: data.provider,
      avatarURL: data.avatarURL || null,
      lastSeen: now,
      updatedAt: now,
    });

    // Write to Firestore (for richer queries, game history)
    await setDoc(doc(db, 'users', data.uid), {
      username: data.username,
      email: data.email || null,
      provider: data.provider,
      avatarURL: data.avatarURL || null,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.warn('Firebase: syncUserProfile failed', e);
  }
}

// ─── Presence System ───
// Update user online status in RTDB (call on app foreground/background).

async function setUserOnline(uid: string): Promise<void> {
  try {
    const presenceRef = ref(rtdb, `presence/${uid}`);
    await fbSet(presenceRef, {
      online: true,
      lastSeen: Date.now(),
    });
  } catch (e) {
    console.warn('Firebase: setUserOnline failed', e);
  }
}

async function setUserOffline(uid: string): Promise<void> {
  try {
    const presenceRef = ref(rtdb, `presence/${uid}`);
    await fbSet(presenceRef, {
      online: false,
      lastSeen: Date.now(),
    });
  } catch (e) {
    console.warn('Firebase: setUserOffline failed', e);
  }
}

// ─── RTDB Structure Reference ───
//
// users/
//   {uid}/
//     username, email, provider, avatarURL, lastSeen, updatedAt
//     wallet/  { balance, lastDailyClaim, updatedAt }
//     inviteCode
//
// presence/
//   {uid}/ { online, lastSeen }
//
// friendships/
//   {uid}/{friendUid}/ { since, status }
//
// friendRequests/
//   {requestId}/ { fromUserId, toUserId, status, createdAt }
//
// rooms/
//   {roomCode}/ { gameType, playMode, hostId, players, createdAt, status }
//
// sessions/
//   {sessionId}/ { gameState, scores, phase, ... }
//
// telemetry/
//   {eventId}/ { type, userId, payload, timestamp }

export {
  app,
  auth,
  db,
  rtdb,
  storage,
  firebaseConfig,
  syncUserProfile,
  setUserOnline,
  setUserOffline,
};
