import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'mp.device_id.v1';

/**
 * DeviceIdentity — matches iOS DeviceIdentity.swift
 * Stable per-install device identifier for telemetry & multiplayer.
 * Persists in AsyncStorage; resets only if app storage is cleared.
 */
export const DeviceIdentity = {
  /** Cached in-memory to avoid async reads */
  _cachedId: null as string | null,

  /** Get or create a stable device ID */
  async getDeviceID(): Promise<string> {
    if (this._cachedId) return this._cachedId;

    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      this._cachedId = existing;
      return existing;
    }

    const newId = generateUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    this._cachedId = newId;
    return newId;
  },

  /** Synchronous access after first load */
  get cachedDeviceID(): string | null {
    return this._cachedId;
  },

  /** App version string */
  get appVersion(): string {
    const version = Constants.expoConfig?.version || '0';
    const buildNumber = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode?.toString() || '0';
    return `${version}(${buildNumber})`;
  },

  /** Platform identifier */
  get platform(): string {
    return Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'web';
  },

  /** Initialize (call once at app startup to warm cache) */
  async init(): Promise<void> {
    await this.getDeviceID();
  },
};

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
