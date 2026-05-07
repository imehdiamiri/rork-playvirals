import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  KeyboardEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSettingsStore } from '@/src/store/useSettingsStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PAGES = [0, 1, 2, 3] as const;
type PageIndex = 0 | 1 | 2 | 3;

const ART = {
  bored: 'https://r2-pub.rork.com/generated-images/ba33a05c-abff-486d-9e1d-0d3ed5f83aed.png',
  party: 'https://r2-pub.rork.com/generated-images/66b3a840-d10e-4a87-9f3b-289a24ad85a3.png',
  portrait: 'https://r2-pub.rork.com/generated-images/7e778e35-51c7-4377-8b20-29bb47f98f1a.png',
  hero: 'https://r2-pub.rork.com/generated-images/8c8fd684-25b2-46f3-a9fc-1c50dd368d01.png',
} as const;

const INK = '#111111';
const CREAM = '#FFF7E1';
const YELLOW = '#FFD60A';
const PINK = '#FF2D55';
const GREEN = '#30D158';
const BLUE = '#0A84FF';

type PageTheme = {
  bg: string;
  accent: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  art: string;
  rotate: number;
};

const THEMES: PageTheme[] = [
  { bg: YELLOW, accent: PINK, eyebrow: 'THE SILENCE IS REAL', title: 'Hangouts going\nflat already?', subtitle: "Phones dead. Vibes deader. We've all been there.", art: ART.bored, rotate: -3 },
  { bg: GREEN, accent: PINK, eyebrow: 'ENTER PARTYBOT', title: "We came to\nblow up\nthe room", subtitle: 'Quick, loud party games — ready in seconds.', art: ART.party, rotate: 2.5 },
  { bg: PINK, accent: YELLOW, eyebrow: "WHAT'S YOUR NAME?", title: 'Slap your\nname on it', subtitle: 'This is going on the leaderboard, so spell it right.', art: ART.portrait, rotate: -2 },
  { bg: BLUE, accent: YELLOW, eyebrow: 'SUIT UP', title: 'Ready to\nown the room?', subtitle: 'Drop the first game and watch the room light up.', art: ART.hero, rotate: 3 },
];

/** Halftone dot pattern + chunky frame backdrop drawn behind hero art for that printed-zine vibe. */
function StickerStage({ active, art, rotate, frameColor }: { active: boolean; art: string; rotate: number; frameColor: string }) {
  const enter = useSharedValue(0);
  const float = useSharedValue(0);

  useEffect(() => {
    if (active) {
      enter.value = withSpring(1, { damping: 12, stiffness: 110 });
      float.value = withRepeat(
        withSequence(withTiming(1, { duration: 2400 }), withTiming(0, { duration: 2400 })),
        -1,
        true,
      );
    } else {
      enter.value = withTiming(0, { duration: 180 });
      float.value = 0;
    }
  }, [active, enter, float]);

  const frameStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { scale: interpolate(enter.value, [0, 1], [0.85, 1], Extrapolate.CLAMP) },
      { rotate: `${interpolate(enter.value, [0, 1], [rotate * 2, rotate], Extrapolate.CLAMP)}deg` },
    ],
  }));

  const artStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float.value, [0, 1], [-6, 6], Extrapolate.CLAMP) },
      { rotate: `${interpolate(float.value, [0, 1], [-1.5, 1.5], Extrapolate.CLAMP)}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.stickerWrap, frameStyle]}>
      <View style={[styles.stickerShadow, { backgroundColor: INK }]} />
      <View style={[styles.stickerFrame, { backgroundColor: frameColor }]}>
        <View style={styles.dotPattern} pointerEvents="none">
          {Array.from({ length: 7 * 7 }).map((_, i) => (
            <View key={i} style={styles.dot} />
          ))}
        </View>
        <Animated.View style={[styles.artHolder, artStyle]}>
          <Image source={{ uri: art }} style={styles.artImage} resizeMode="contain" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function HeroStage({ active, name }: { active: boolean; name: string }) {
  const float = useSharedValue(0);
  const enter = useSharedValue(0);
  const heroName = name.trim() || 'HERO';

  useEffect(() => {
    if (active) {
      enter.value = withSpring(1, { damping: 12, stiffness: 110 });
      float.value = withRepeat(
        withSequence(withTiming(1, { duration: 1800 }), withTiming(0, { duration: 1800 })),
        -1,
        true,
      );
    } else {
      enter.value = withTiming(0, { duration: 180 });
      float.value = 0;
    }
  }, [active, enter, float]);

  const frameStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { scale: interpolate(enter.value, [0, 1], [0.85, 1], Extrapolate.CLAMP) },
      { rotate: `${interpolate(enter.value, [0, 1], [6, 3], Extrapolate.CLAMP)}deg` },
    ],
  }));

  const artStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float.value, [0, 1], [-8, 4], Extrapolate.CLAMP) },
    ],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(float.value, [0, 1], [-4, 4], Extrapolate.CLAMP)}deg` },
      { scale: interpolate(float.value, [0, 1], [0.96, 1.04], Extrapolate.CLAMP) },
    ],
  }));

  return (
    <Animated.View style={[styles.stickerWrap, frameStyle]}>
      <View style={[styles.stickerShadow, { backgroundColor: INK }]} />
      <View style={[styles.stickerFrame, { backgroundColor: YELLOW }]}>
        <View style={styles.dotPattern} pointerEvents="none">
          {Array.from({ length: 7 * 7 }).map((_, i) => <View key={i} style={styles.dot} />)}
        </View>
        <Animated.View style={[styles.artHolder, artStyle]}>
          <Image source={{ uri: ART.hero }} style={styles.artImage} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={[styles.heroBadge, badgeStyle]} pointerEvents="none">
          <View style={styles.heroBadgeShadow} />
          <View style={styles.heroBadgeInner}>
            <Text style={styles.heroBadgeText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {heroName.toUpperCase()}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function IndicatorBar({ index, scrollX }: { index: number; scrollX: Animated.SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH], [16, 44, 16], Extrapolate.CLAMP),
    opacity: interpolate(scrollX.value, [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH], [0.35, 1, 0.35], Extrapolate.CLAMP),
  }));
  return <Animated.View style={[styles.indicator, animatedStyle]} />;
}

function PageBackground({ scrollX }: { scrollX: Animated.SharedValue<number> }) {
  const animated = useAnimatedStyle(() => {
    const progress = scrollX.value / SCREEN_WIDTH;
    const colors = THEMES.map(t => t.bg);
    const idx = Math.max(0, Math.min(colors.length - 2, Math.floor(progress)));
    const f = Math.max(0, Math.min(1, progress - idx));
    // We can't interpolate colors easily without runOnJS; just snap with a fade ribbon overlay below.
    return { opacity: 1 - f * 0 };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animated]}>
      {THEMES.map((t, i) => (
        <ColorPanel key={i} index={i} scrollX={scrollX} color={t.bg} />
      ))}
    </Animated.View>
  );
}

function ColorPanel({ index, scrollX, color }: { index: number; scrollX: Animated.SharedValue<number>; color: string }) {
  const a = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH],
      [0, 1, 0],
      Extrapolate.CLAMP,
    ),
  }));
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color }, a]} />;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setHasCompletedOnboarding, setPlayerName } = useSettingsStore();
  const [currentPage, setCurrentPage] = useState<PageIndex>(0);
  const [name, setName] = useState<string>('');
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const scrollX = useSharedValue(0);

  useEffect(() => {
    if (currentPage === 2) setTimeout(() => inputRef.current?.focus(), 460);
  }, [currentPage]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (_e: KeyboardEvent) => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => { scrollX.value = event.contentOffset.x; },
  });

  const goToPage = useCallback((page: PageIndex) => {
    scrollViewRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
    setCurrentPage(page);
  }, []);

  const goNext = useCallback(() => {
    if (currentPage < 3) goToPage((currentPage + 1) as PageIndex);
  }, [currentPage, goToPage]);

  const complete = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    Keyboard.dismiss();
    setPlayerName(trimmed);
    setHasCompletedOnboarding(true);
    router.replace('/(tabs)');
  }, [name, router, setHasCompletedOnboarding, setPlayerName]);

  const isNameValid = name.trim().length >= 2;
  const onLastPage = currentPage === 3;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <PageBackground scrollX={scrollX} />

          <Animated.ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            onMomentumScrollEnd={(event) => setCurrentPage(Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH) as PageIndex)}
          >
            {THEMES.map((theme, i) => (
              <View key={i} style={styles.page}>
                <View style={styles.brandRow}>
                  <View style={[styles.brandPill, { backgroundColor: INK }]}>
                    <Text style={styles.brandText}>PARTY<Text style={{ color: theme.bg }}>BOT</Text></Text>
                  </View>
                  {i < 3 && (
                    <Pressable onPress={() => goToPage(3)} hitSlop={12}>
                      <Text style={styles.skipText}>SKIP</Text>
                    </Pressable>
                  )}
                </View>

                <View style={styles.stageWrap}>
                  {i === 3
                    ? <HeroStage active={currentPage === 3} name={name} />
                    : i === 2
                      ? <NameSticker active={currentPage === 2} name={name} setName={setName} inputRef={inputRef} />
                      : <StickerStage active={currentPage === i} art={theme.art} rotate={theme.rotate} frameColor={theme.accent} />}
                </View>

                {!(i === 2 && keyboardVisible) && (
                  <CopyBlock active={currentPage === i} eyebrow={theme.eyebrow} title={theme.title} subtitle={theme.subtitle} />
                )}
              </View>
            ))}
          </Animated.ScrollView>

          <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.indicators}>
              {PAGES.map((i) => <IndicatorBar key={i} index={i} scrollX={scrollX} />)}
            </View>

            <Pressable
              disabled={currentPage === 2 && !isNameValid}
              onPress={onLastPage ? complete : goNext}
              style={({ pressed }) => [
                styles.cta,
                pressed && styles.ctaPressed,
                currentPage === 2 && !isNameValid && styles.ctaDisabled,
              ]}
            >
              <View style={styles.ctaShadow} />
              <View style={styles.ctaInner}>
                <Text style={styles.ctaText}>
                  {onLastPage ? "LET'S PLAY" : currentPage === 2 ? (isNameValid ? 'LOOKS GOOD' : 'TYPE YOUR NAME') : 'CONTINUE'}
                </Text>
                <IconSymbol name={onLastPage ? 'gamecontroller.fill' : 'chevron.right'} size={18} color={INK} />
              </View>
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function CopyBlock({ active, eyebrow, title, subtitle }: { active: boolean; eyebrow: string; title: string; subtitle: string }) {
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = active
      ? withDelay(140, withSpring(1, { damping: 14, stiffness: 130 }))
      : withTiming(0, { duration: 160 });
  }, [active, enter]);
  const a = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [22, 0], Extrapolate.CLAMP) }],
  }));
  return (
    <Animated.View style={[styles.copyBlock, a]}>
      <View style={styles.eyebrowPill}>
        <Text style={styles.eyebrowText}>{eyebrow}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Animated.View>
  );
}

function NameSticker({ active, name, setName, inputRef }: { active: boolean; name: string; setName: (s: string) => void; inputRef: React.RefObject<TextInput | null> }) {
  const enter = useSharedValue(0);
  const wobble = useSharedValue(0);

  useEffect(() => {
    if (active) {
      enter.value = withSpring(1, { damping: 12, stiffness: 110 });
      wobble.value = withRepeat(
        withSequence(withTiming(1, { duration: 2200 }), withTiming(0, { duration: 2200 })),
        -1,
        true,
      );
    } else {
      enter.value = withTiming(0, { duration: 180 });
      wobble.value = 0;
    }
  }, [active, enter, wobble]);

  const frameStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { scale: interpolate(enter.value, [0, 1], [0.85, 1], Extrapolate.CLAMP) },
      { rotate: `${interpolate(wobble.value, [0, 1], [-2, -3], Extrapolate.CLAMP)}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.nameStickerWrap, frameStyle]}>
      <View style={[styles.stickerShadow, { backgroundColor: INK }]} />
      <View style={[styles.nameSticker, { backgroundColor: CREAM }]}>
        <View style={styles.nameStickerHeader}>
          <Text style={styles.nameStickerHeaderText}>HELLO</Text>
          <Text style={styles.nameStickerHeaderSub}>MY NAME IS</Text>
        </View>
        <View style={styles.nameStickerBody}>
          <TextInput
            ref={inputRef}
            value={name}
            onChangeText={setName}
            placeholder="YOUR NAME"
            placeholderTextColor="rgba(17,17,17,0.25)"
            style={styles.nameInput}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            maxLength={14}
          />
          <View style={styles.nameUnderline} />
        </View>
      </View>
    </Animated.View>
  );
}

const STAGE = Math.min(SCREEN_WIDTH - 56, Math.min(SCREEN_HEIGHT * 0.42, 360));
const NAME_W = Math.min(SCREEN_WIDTH - 48, 360);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: YELLOW },
  page: { width: SCREEN_WIDTH, flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 200, alignItems: 'center', justifyContent: 'flex-start' },

  brandRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, marginBottom: 12 },
  brandPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 3, borderColor: INK },
  brandText: { color: '#fff', fontFamily: 'Viral-Black', fontSize: 13, letterSpacing: 2 },
  skipText: { color: INK, fontFamily: 'Viral-Black', fontSize: 13, letterSpacing: 2, opacity: 0.65 },

  stageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: STAGE + 40, width: '100%' },

  stickerWrap: { width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center' },
  stickerShadow: { position: 'absolute', left: 8, top: 10, right: -8, bottom: -10, borderRadius: 28 },
  stickerFrame: { position: 'absolute', inset: 0, borderRadius: 28, borderWidth: 4, borderColor: INK, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  dotPattern: { position: 'absolute', inset: 0, flexDirection: 'row', flexWrap: 'wrap', padding: 14, opacity: 0.18 },
  dot: { width: (STAGE - 28) / 7 - 6, height: (STAGE - 28) / 7 - 6, margin: 3, borderRadius: 999, backgroundColor: INK },
  artHolder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  artImage: { width: '94%', height: '94%' },

  heroBadge: { position: 'absolute', top: '46%', alignSelf: 'center' },
  heroBadgeShadow: { position: 'absolute', left: 4, top: 4, right: -4, bottom: -4, backgroundColor: INK, borderRadius: 999 },
  heroBadgeInner: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#fff', borderRadius: 999, borderWidth: 3, borderColor: INK, maxWidth: STAGE * 0.6 },
  heroBadgeText: { fontFamily: 'Viral-Black', fontSize: 16, color: INK, textAlign: 'center', letterSpacing: 1 },

  nameStickerWrap: { width: NAME_W, alignItems: 'center', justifyContent: 'center' },
  nameSticker: { width: '100%', borderRadius: 22, borderWidth: 4, borderColor: INK, overflow: 'hidden' },
  nameStickerHeader: { backgroundColor: PINK, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: INK },
  nameStickerHeaderText: { fontFamily: 'Viral-Black', color: '#fff', fontSize: 32, letterSpacing: 4 },
  nameStickerHeaderSub: { fontFamily: 'Viral-Black', color: '#fff', fontSize: 12, letterSpacing: 4, opacity: 0.85, marginTop: 2 },
  nameStickerBody: { paddingHorizontal: 22, paddingVertical: 22 },
  nameInput: { fontFamily: 'Viral-Black', fontSize: 30, color: INK, textAlign: 'center', letterSpacing: 2, paddingVertical: Platform.OS === 'ios' ? 6 : 2, includeFontPadding: false },
  nameUnderline: { height: 4, backgroundColor: INK, borderRadius: 4, marginTop: 6 },

  copyBlock: { width: '100%', alignItems: 'center', paddingHorizontal: 8, marginTop: 8 },
  eyebrowPill: { backgroundColor: INK, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginBottom: 12 },
  eyebrowText: { color: '#fff', fontFamily: 'Viral-Black', fontSize: 11, letterSpacing: 2.5 },
  title: { color: INK, fontFamily: 'Viral-Black', fontSize: 30, lineHeight: 34, textAlign: 'center', marginBottom: 8 },
  subtitle: { color: INK, fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '700', opacity: 0.75, paddingHorizontal: 12 },

  bottomControls: { position: 'absolute', left: 24, right: 24, bottom: 0, gap: 14 },
  indicators: { flexDirection: 'row', justifyContent: 'center', gap: 8, height: 16, alignItems: 'center' },
  indicator: { height: 10, borderRadius: 999, backgroundColor: INK, borderWidth: 2, borderColor: INK },

  cta: { height: 64, justifyContent: 'center' },
  ctaShadow: { position: 'absolute', left: 6, top: 8, right: -6, bottom: -8, backgroundColor: INK, borderRadius: 22 },
  ctaInner: { flex: 1, backgroundColor: YELLOW, borderRadius: 22, borderWidth: 4, borderColor: INK, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { color: INK, fontFamily: 'Viral-Black', fontSize: 18, letterSpacing: 1.5 },
  ctaPressed: { transform: [{ translateX: 3 }, { translateY: 4 }] },
  ctaDisabled: { opacity: 0.55 },
});
