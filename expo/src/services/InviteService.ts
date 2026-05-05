import { rtdb as database, auth } from '../lib/firebase';
import { ref, get, update, query, orderByChild, equalTo, set } from 'firebase/database';

export class InviteService {
  static async getMyInviteCode(): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) return '';

    const userRef = ref(database, `users/${uid}/inviteCode`);
    const snapshot = await get(userRef);
    let code = snapshot.val();

    if (!code) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await set(userRef, code);
    }
    return code;
  }

  static async getInviteStats(): Promise<{ totalInvites: number; starsEarned: number }> {
    const uid = auth.currentUser?.uid;
    if (!uid) return { totalInvites: 0, starsEarned: 0 };

    const statsRef = ref(database, `users/${uid}/inviteStats`);
    const snapshot = await get(statsRef);
    const val = snapshot.val() || {};
    return {
      totalInvites: val.totalInvites || 0,
      starsEarned: val.starsEarned || 0,
    };
  }

  static async redeemCode(code: string): Promise<boolean> {
    const uid = auth.currentUser?.uid;
    if (!uid || !code.trim()) throw new Error('Invalid input');

    const cleanCode = code.trim().toUpperCase();

    // 1. Check if user already redeemed a code
    const invitedByRef = ref(database, `users/${uid}/invitedBy`);
    const checkSnap = await get(invitedByRef);
    if (checkSnap.exists()) {
      throw new Error('You have already redeemed an invite code.');
    }

    // 2. Find the referrer by code
    const usersRef = ref(database, 'users');
    const q = query(usersRef, orderByChild('inviteCode'), equalTo(cleanCode));
    const snapshot = await get(q);

    if (!snapshot.exists()) {
      throw new Error('Invalid invite code.');
    }

    let referrerUid = '';
    snapshot.forEach((child) => {
      referrerUid = child.key as string;
    });

    if (referrerUid === uid) {
      throw new Error('You cannot redeem your own invite code.');
    }

    // +10 stars for the new user
    const myWalletRef = ref(database, `users/${uid}/wallet`);
    const myWalletSnap = await get(myWalletRef);
    const myBalance = (myWalletSnap.exists() ? myWalletSnap.val().balance || 0 : 0) + 10;

    // +30 stars for the referrer
    const refWalletRef = ref(database, `users/${referrerUid}/wallet`);
    const refWalletSnap = await get(refWalletRef);
    const refBalance = (refWalletSnap.exists() ? refWalletSnap.val().balance || 0 : 0) + 30;

    const refStatsRef = ref(database, `users/${referrerUid}/inviteStats`);
    const refStatsSnap = await get(refStatsRef);
    const refStats = refStatsSnap.val() || { totalInvites: 0, starsEarned: 0 };

    // 4. Update Database
    const updates: any = {};
    updates[`users/${uid}/invitedBy`] = referrerUid;
    updates[`users/${uid}/wallet/balance`] = myBalance;
    updates[`users/${uid}/wallet/updatedAt`] = Date.now();
    updates[`users/${referrerUid}/wallet/balance`] = refBalance;
    updates[`users/${referrerUid}/wallet/updatedAt`] = Date.now();
    updates[`users/${referrerUid}/inviteStats/totalInvites`] = refStats.totalInvites + 1;
    updates[`users/${referrerUid}/inviteStats/starsEarned`] = refStats.starsEarned + 30;

    await update(ref(database), updates);
    return true;
  }
}
