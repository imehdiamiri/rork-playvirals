import AsyncStorage from '@react-native-async-storage/async-storage';
import { rtdb as database } from '../lib/firebase';
import { ref, get } from 'firebase/database';

const SESSION_ID_KEY = 'active_session_id';
const ROOM_CODE_KEY = 'active_session_room_code';

type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';

/**
 * SessionResilienceService — matches iOS SessionResilienceService.swift
 * Stores active session in AsyncStorage for recovery after app crash/background.
 * Exponential backoff reconnection. Host disconnect detection.
 */
class _SessionResilienceService {
  private reconnectRetryCount = 0;
  private maxReconnectRetries = 5;
  connectionState: ConnectionState = 'connected';

  onConnectionStateChanged?: (state: ConnectionState) => void;
  onSyncError?: (message: string) => void;

  // ─── Persist active session ───

  async storeActiveSession(sessionId: string, roomCode?: string): Promise<void> {
    await AsyncStorage.setItem(SESSION_ID_KEY, sessionId);
    if (roomCode) {
      await AsyncStorage.setItem(ROOM_CODE_KEY, roomCode);
    }
  }

  async clearActiveSession(): Promise<void> {
    await AsyncStorage.multiRemove([SESSION_ID_KEY, ROOM_CODE_KEY]);
  }

  async storedSessionID(): Promise<string | null> {
    return AsyncStorage.getItem(SESSION_ID_KEY);
  }

  async storedRoomCode(): Promise<string | null> {
    return AsyncStorage.getItem(ROOM_CODE_KEY);
  }

  // ─── Session recovery ───

  async checkForActiveSession(): Promise<{ sessionId: string; roomCode: string | null } | null> {
    const sessionId = await this.storedSessionID();
    if (!sessionId) return null;

    try {
      const roomCode = await this.storedRoomCode();
      // Check if room still exists in Firebase
      if (roomCode) {
        const roomRef = ref(database, `rooms/${roomCode}`);
        const snapshot = await get(roomRef);
        if (!snapshot.exists()) {
          await this.clearActiveSession();
          return null;
        }
        const roomData = snapshot.val();
        if (roomData.status === 'closed') {
          await this.clearActiveSession();
          return null;
        }
      }
      return { sessionId, roomCode };
    } catch {
      await this.clearActiveSession();
      return null;
    }
  }

  // ─── Reconnection with exponential backoff ───

  async attemptReconnect(
    roomCode: string,
    onSuccess: () => void,
    onFailure: (error: string) => void
  ): Promise<void> {
    if (this.reconnectRetryCount >= this.maxReconnectRetries) {
      this.updateConnectionState('disconnected');
      this.onSyncError?.('Unable to reconnect after multiple attempts.');
      onFailure('Max retries exceeded');
      return;
    }

    this.updateConnectionState('reconnecting');
    this.reconnectRetryCount++;

    const delay = Math.min(Math.pow(2, this.reconnectRetryCount), 16) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      const roomRef = ref(database, `rooms/${roomCode}`);
      const snapshot = await get(roomRef);

      if (snapshot.exists() && snapshot.val().status !== 'closed') {
        this.updateConnectionState('connected');
        this.reconnectRetryCount = 0;
        onSuccess();
      } else {
        onFailure('Room no longer exists');
        this.updateConnectionState('disconnected');
      }
    } catch (e: any) {
      this.onSyncError?.(`Failed to sync: ${e.message}`);
      if (this.reconnectRetryCount < this.maxReconnectRetries) {
        await this.attemptReconnect(roomCode, onSuccess, onFailure);
      } else {
        this.updateConnectionState('disconnected');
        onFailure(e.message);
      }
    }
  }

  resetReconnectCount(): void {
    this.reconnectRetryCount = 0;
  }

  // ─── Host disconnect detection ───

  detectHostDisconnect(
    presence: Record<string, { online: boolean; lastSeen: number }>,
    hostPlayerId: string,
    localPlayerId: string
  ): boolean {
    if (hostPlayerId === localPlayerId) return false; // I am the host
    const hostPresence = presence[hostPlayerId];
    if (!hostPresence) return true; // host not in presence at all
    return !hostPresence.online;
  }

  private updateConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.onConnectionStateChanged?.(state);
  }
}

export const SessionResilienceService = new _SessionResilienceService();
