import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Glass, platformShadow } from '@/src/theme/Colors';
import { LiquidGlass } from '@/src/components/LiquidGlass';

const TAB_ITEMS = [
  { name: 'index', label: 'Games', icon: 'gamecontroller.fill', accent: Colors.blue },
  { name: 'tools', label: 'Tools', icon: 'wrench.and.screwdriver.fill', accent: Colors.mint },
  { name: 'friends', label: 'Friends', icon: 'person.2.fill', accent: Colors.pink },
  { name: 'factory', label: 'Factory', icon: 'wand.and.stars', accent: Colors.purple },
] as const;

function TabPill({ focused }: { focused: boolean; accent: string }) {
  const opacity = useSharedValue(focused ? 1 : 0);
  const scale = useSharedValue(focused ? 1 : 0.7);

  useEffect(() => {
    opacity.value = withTiming(focused ? 1 : 0, { duration: 240 });
    scale.value = withSpring(focused ? 1 : 0.7, { damping: 16, stiffness: 200 });
  }, [focused, opacity, scale]);

  const aStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { borderRadius: 18 }, aStyle]}
    >
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.16)',
            borderWidth: 0.5,
            borderColor: 'rgba(255,255,255,0.22)',
          },
        ]}
      />
    </Animated.View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === 'ios' ? Math.max(insets.bottom, 18) : 18;

  return (
    <View style={[styles.tabBarContainer, { bottom }]} pointerEvents="box-none">
      <LiquidGlass
        variant="chrome"
        radius={32}
        specular
        shadow
        style={styles.tabBarShell}
      >
        <View style={styles.tabBarContent}>
          {state.routes
            .filter((r: any) => TAB_ITEMS.some((t) => t.name === r.name))
            .map((route: any) => {
              const item = TAB_ITEMS.find((t) => t.name === route.name);
              if (!item) return null;
              const realIndex = state.routes.findIndex((r: any) => r.key === route.key);
              const isFocused = state.index === realIndex;
              const { options } = descriptors[route.key];

              const onPress = () => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(
                    isFocused
                      ? Haptics.ImpactFeedbackStyle.Light
                      : Haptics.ImpactFeedbackStyle.Medium
                  );
                }
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              const tint = isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.55)';

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  android_ripple={{
                    color: 'rgba(255,255,255,0.18)',
                    borderless: true,
                    radius: 28,
                  }}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  style={styles.tabItem}
                >
                  <View style={[styles.iconContainer, isFocused && styles.iconContainerActive]}>
                    <TabPill focused={isFocused} accent={item.accent} />
                    <IconSymbol size={22} name={item.icon as any} color={tint} />
                    {isFocused && (
                      <Text style={styles.labelActive} numberOfLines={1}>
                        {item.label}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
        </View>
      </LiquidGlass>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Games' }} />
      <Tabs.Screen name="tools" options={{ title: 'Tools' }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends' }} />
      <Tabs.Screen name="factory" options={{ title: 'Factory' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 28,
    right: 28,
    height: 58,
    ...platformShadow(18, '#000', 0.5, 28),
  },
  tabBarShell: {
    flex: 1,
    borderRadius: 29,
    overflow: 'hidden',
  },
  tabBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 5,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    paddingHorizontal: 10,
    minWidth: 42,
    borderRadius: 18,
    gap: 6,
  },
  iconContainerActive: {
    paddingHorizontal: 14,
  },
  labelActive: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});

// Reference unused import suppression
void Glass;
