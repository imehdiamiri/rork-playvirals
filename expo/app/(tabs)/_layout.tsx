import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Glass, platformShadow } from '@/src/theme/Colors';
import { LiquidGlass } from '@/src/components/LiquidGlass';

const TAB_ITEMS = [
  { name: 'index', label: 'Games', icon: 'gamecontroller.fill' },
  { name: 'tools', label: 'Tools', icon: 'wrench.and.screwdriver.fill' },
  { name: 'friends', label: 'Friends', icon: 'person.2.fill' },
  { name: 'factory', label: 'Factory', icon: 'wand.and.stars' },
] as const;

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 16;

  return (
    <View style={[styles.tabBarContainer, { bottom }]} pointerEvents="box-none">
      <LiquidGlass variant="high" radius={30} shadow style={styles.tabBarShell}>
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

              const tint = isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.6)';

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  android_ripple={{
                    color: 'rgba(255,255,255,0.14)',
                    borderless: false,
                    foreground: true,
                  }}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  style={[styles.tabItem, isFocused && styles.tabItemActive]}
                >
                  <IconSymbol size={22} name={item.icon as any} color={tint} weight="bold" />
                  <Text
                    style={isFocused ? styles.labelActive : styles.labelInactive}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
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
    left: 16,
    right: 16,
    ...platformShadow(18, '#000', 0.5, 28),
  },
  tabBarShell: {
    borderRadius: 30,
    padding: 4,
    overflow: 'hidden',
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 22,
    overflow: 'hidden',
  },
  tabItemActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.95)',
    shadowColor: Colors.blue,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  labelActive: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  labelInactive: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
});

// Reference unused import suppression
void Glass;
