import * as Haptics from '@/src/utils/safeHaptics';
import { useSettingsStore } from '@/src/store/useSettingsStore';

/**
 * SoundManager — Centralized feedback service matching iOS FeedbackService.
 * Wraps haptics with settings toggle.
 * Audio sound effects can be added here later with expo-av.
 */
export const SoundManager = {
  /** Light tap — tile flip, option select */
  tap() {
    if (useSettingsStore.getState().isVibrationEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  /** Medium impact — button press, card flip */
  click() {
    if (useSettingsStore.getState().isVibrationEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },

  /** Heavy impact — game over, elimination */
  heavy() {
    if (useSettingsStore.getState().isVibrationEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  },

  /** Success notification — correct answer, game win */
  success() {
    if (useSettingsStore.getState().isVibrationEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },

  /** Error notification — wrong answer, forbidden tile */
  error() {
    if (useSettingsStore.getState().isVibrationEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },

  /** Warning notification — time running low, last life */
  warning() {
    if (useSettingsStore.getState().isVibrationEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  },

  /** Selection change — picker scroll, option toggle */
  selection() {
    if (useSettingsStore.getState().isVibrationEnabled) {
      Haptics.selectionAsync();
    }
  },
};
