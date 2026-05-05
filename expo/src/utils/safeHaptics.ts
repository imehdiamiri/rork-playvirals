import { Platform } from 'react-native';

/**
 * Safe haptics wrapper that no-ops on web.
 * Import this instead of expo-haptics to avoid web crashes.
 */

const isNative = Platform.OS !== 'web';

let HapticsModule: any = null;
if (isNative) {
  try {
    HapticsModule = require('expo-haptics');
  } catch {}
}

export const ImpactFeedbackStyle = {
  Light: 'Light' as const,
  Medium: 'Medium' as const,
  Heavy: 'Heavy' as const,
};

export const NotificationFeedbackType = {
  Success: 'Success' as const,
  Warning: 'Warning' as const,
  Error: 'Error' as const,
};

export async function impactAsync(style?: string) {
  if (HapticsModule) {
    try { await HapticsModule.impactAsync(style); } catch {}
  }
}

export async function notificationAsync(type?: string) {
  if (HapticsModule) {
    try { await HapticsModule.notificationAsync(type); } catch {}
  }
}

export async function selectionAsync() {
  if (HapticsModule) {
    try { await HapticsModule.selectionAsync(); } catch {}
  }
}
