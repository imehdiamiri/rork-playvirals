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
import { LinearGradient } from 'expo-linear-gradient';
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
import { AppBackgroundView } from '@/src/components/AppBackgroundView';
import { GlowView } from '@/src/components/ui/GlowView';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { Colors } from '@/src/theme/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGES = [0, 1, 2, 3] as const;

type PageIndex = 0 | 1 | 2 | 3;

const ART = {
  bored: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/gyy4cw0q1z7hha68b3m2o.png',
  party: 'https://r2-pub.rork.com/generated-images/a1e2567b-9b78-475c-8fda-1f28dd857bcc.png',
  portrait: 'https://r2-pub.rork.com/generated-images/28690dc8-d374-4867-8500-ad431193dad0.png',
  hero: 'https://r2-pub.rork.com/generated-images/b2f343f8-cd5f-49e6-898a-43529c733277.png',
} as const;

function EnterStage({ active, delay = 0, children, style }: { active: boolean; delay?: number; children: React.ReactNode; style?: any }) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = active
      ? withDelay(delay, withSpring(1, { damping: 15, stiffness: 120 }))
      : withTiming(0, { duration: 160 });
  }, [active, delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [28, 0], Extrapolate.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [0.94, 1], Extrapolate.CLAMP) },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

function FloatingArt({ active, source, glowColor, compact }: { active: boolean; source: string; glowColor: string; compact?: boolean }) {
  const float = useSharedValue(0);

  useEffect(() => {
    if (active) {
      float.value = withRepeat(
        withSequence(withTiming(1, { duration: 2200 }), withTiming(0, { duration: 2200 })),
        -1,
        true,
      );
    } else {
      float.value = 0;
    }
  }, [active, float]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float.value, [0, 1], [-6, 6], Extrapolate.CLAMP) },
      { rotate: `${interpolate(float.value, [0, 1], [-1.5, 1.5], Extrapolate.CLAMP)}deg` },
    ],
  }));

  const stageStyle = compact ? styles.artStageCompact : styles.artStage;
  const imgStyle = compact ? styles.artImageCompact : styles.artImage;
  const glowSize = compact ? 200 : 320;

  return (
    <EnterStage active={active}>
      <View style={stageStyle}>
        <GlowView color={glowColor} size={glowSize} style={styles.artGlow} />
        <Animated.View style={floatStyle}>
          <Image source={{ uri: source }} style={imgStyle} resizeMode="contain" />
        </Animated.View>
      </View>
    </EnterStage>
  );
}

function HeroArt({ active, name }: { active: boolean; name: string }) {
  const float = useSharedValue(0);
  const heroName = name.trim() || 'Hero';

  useEffect(() => {
    if (active) {
      float.value = withRepeat(
        withSequence(withTiming(1, { duration: 1800 }), withTiming(0, { duration: 1800 })),
        -1,
        true,
      );
    } else {
      float.value = 0;
    }
  }, [active, float]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float.value, [0, 1], [-8, 4], Extrapolate.CLAMP) },
      { scale: interpolate(float.value, [0, 1], [0.99, 1.02], Extrapolate.CLAMP) },
    ],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(float.value, [0, 1], [-3, 3], Extrapolate.CLAMP)}deg` },
      { scale: interpolate(float.value, [0, 1], [0.96, 1.04], Extrapolate.CLAMP) },
    ],
  }));

  return (
    <EnterStage active={active}>
      <View style={styles.artStage}>
        <GlowView color="rgba(255, 45, 85, 0.32)" size={260} style={styles.artGlow} />
        <Animated.View style={floatStyle}>
          <Image source={{ uri: ART.hero }} style={styles.artImage} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={[styles.heroNameBadge, badgeStyle]} pointerEvents="none">
          <Text style={styles.heroNameText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{heroName.toUpperCase()}</Text>
        </Animated.View>
      </View>
    </EnterStage>
  );
}

function IndicatorDot({ index, scrollX }: { index: number; scrollX: Animated.SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH], [8, 30, 8], Extrapolate.CLAMP),
    opacity: interpolate(scrollX.value, [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH], [0.3, 1, 0.3], Extrapolate.CLAMP),
  }));
  return <Animated.View style={[styles.indicator, animatedStyle]} />;
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
    return () => {
      showSub.remove();
      hideSub.remove();
    };
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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <AppBackgroundView />
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
            <OnboardPage
              active={currentPage === 0}
              eyebrow="THE SILENCE IS REAL"
              title={'Hangout going\nflat already?'}
              subtitle="Phones dead, vibes deader. We've all been there."
            >
              <FloatingArt active={currentPage === 0} source={ART.bored} glowColor="rgba(255, 159, 10, 0.42)" />
            </OnboardPage>

            <OnboardPage
              active={currentPage === 1}
              eyebrow="ENTER PLAYVIRALS"
              title={'We came to\nblow up the room'}
              subtitle="Quick, hilarious party games — ready to go in seconds."
            >
              <FloatingArt active={currentPage === 1} source={ART.party} glowColor="rgba(48, 209, 88, 0.45)" />
            </OnboardPage>

            <View style={styles.page}>
              <EnterStage active={currentPage === 2} delay={60}>
                <View style={styles.idCard}>
                  <View style={styles.idCardTopBar}>
                    <Text style={styles.idCardBrand}>PLAYVIRALS</Text>
                    <Text style={styles.idCardBrandSub}>OFFICIAL ID</Text>
                  </View>
                  <View style={styles.idCardBody}>
                    <View style={styles.idCardPhotoFrame}>
                      <Image source={{ uri: ART.portrait }} style={styles.idCardPhoto} resizeMode="cover" />
                    </View>
                    <View style={styles.idCardFields}>
                      <Text style={styles.idCardFieldLabel}>NAME</Text>
                      <TextInput
                        ref={inputRef}
                        value={name}
                        onChangeText={setName}
                        placeholder="YOUR NAME"
                        placeholderTextColor="rgba(0,0,0,0.25)"
                        style={styles.idCardInput}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        maxLength={14}
                      />
                      <View style={styles.idCardUnderline} />
                      <View style={styles.idCardMetaRow}>
                        <View style={styles.idCardMetaCol}>
                          <Text style={styles.idCardMetaLabel}>ROLE</Text>
                          <Text style={styles.idCardMetaValue}>PARTY HERO</Text>
                        </View>
                        <View style={styles.idCardMetaCol}>
                          <Text style={styles.idCardMetaLabel}>ID</Text>
                          <Text style={styles.idCardMetaValue}>#001</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.idCardBottomStripe} />
                </View>
              </EnterStage>
              {!keyboardVisible && (
                <EnterStage active={currentPage === 2} delay={180}>
                  <View style={[styles.copyCard, { marginTop: 22 }]}>
                    <Text style={styles.eyebrow}>WHAT&apos;S YOUR NAME?</Text>
                    <Text style={styles.subtitle}>Tap the card to fill in your party ID.</Text>
                  </View>
                </EnterStage>
              )}
            </View>

            <OnboardPage
              active={currentPage === 3}
              eyebrow="SUIT UP"
              title={`Ready to own\nthe room, ${name.trim() || 'hero'}?`}
              subtitle="Time to drop the first game and watch the room light up."
            >
              <HeroArt active={currentPage === 3} name={name} />
            </OnboardPage>
          </Animated.ScrollView>

          <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 32 }]}>
            <View style={styles.indicators}>
              {PAGES.map((i) => <IndicatorDot key={i} index={i} scrollX={scrollX} />)}
            </View>
            {currentPage === 2 && !isNameValid ? (
              <Text style={styles.helper}>At least 2 letters</Text>
            ) : <View style={styles.helperSpace} />}
            <Pressable
              disabled={currentPage === 2 && !isNameValid}
              onPress={currentPage === 3 ? complete : goNext}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, currentPage === 2 && !isNameValid && styles.primaryButtonDisabled]}
            >
              <LinearGradient
                colors={currentPage === 3 ? ['#FF2D55', '#FF9F0A'] : ['#0A84FF', '#30D158']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.primaryButtonText}>{currentPage === 3 ? "Let's Play" : 'Continue'}</Text>
              <IconSymbol name={currentPage === 3 ? 'gamecontroller.fill' : 'chevron.right'} size={17} color="#fff" />
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function OnboardPage({ active, eyebrow, title, subtitle, children, compact }: { active: boolean; eyebrow: string; title: string; subtitle: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <View style={[styles.page, compact && styles.pageCompact]}>
      <View style={[styles.artWrap, compact && styles.artWrapCompact]}>{children}</View>
      <EnterStage active={active} delay={120}>
        <View style={styles.copyCard}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          {!compact && <Text style={styles.title}>{title}</Text>}
          {!compact && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </EnterStage>
    </View>
  );
}

const ART_SIZE = Math.min(SCREEN_WIDTH - 48, 360);
const ART_SIZE_COMPACT = 140;
const ID_CARD_WIDTH = Math.min(SCREEN_WIDTH - 40, 360);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  page: { width: SCREEN_WIDTH, flex: 1, justifyContent: 'center', paddingHorizontal: 22, paddingBottom: 180, paddingTop: 20 },
  pageCompact: { justifyContent: 'flex-start', paddingTop: 24, paddingBottom: 200 },
  artWrap: { alignItems: 'center', justifyContent: 'center', minHeight: ART_SIZE + 16, marginBottom: 8 },
  artWrapCompact: { minHeight: ART_SIZE_COMPACT + 8, marginBottom: 4 },
  artStage: { width: ART_SIZE, height: ART_SIZE, alignItems: 'center', justifyContent: 'center' },
  artStageCompact: { width: ART_SIZE_COMPACT, height: ART_SIZE_COMPACT, alignItems: 'center', justifyContent: 'center' },
  artGlow: { position: 'absolute', alignSelf: 'center' },
  artImage: { width: ART_SIZE, height: ART_SIZE },
  artImageCompact: { width: ART_SIZE_COMPACT, height: ART_SIZE_COMPACT },
  heroNameBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '48%',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#FFD60A',
    borderWidth: 2,
    borderColor: '#fff',
    maxWidth: ART_SIZE * 0.36,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  heroNameText: { fontFamily: 'Viral-Black', fontSize: 11, color: '#111827', textAlign: 'center', letterSpacing: 0.5 },
  copyCard: { alignItems: 'center', paddingHorizontal: 10, marginTop: 8 },
  eyebrow: { color: '#FFD60A', fontSize: 11, fontFamily: 'Viral-Black', marginBottom: 10, letterSpacing: 2 },
  title: { color: '#fff', fontFamily: 'Viral-Black', fontSize: 26, lineHeight: 32, textAlign: 'center', marginBottom: 10 },
  subtitle: { color: 'rgba(255,255,255,0.62)', fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '600', paddingHorizontal: 14 },
  inputShell: { marginTop: 18, width: SCREEN_WIDTH - 72, height: 60, borderRadius: 22, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  input: { flex: 1, textAlign: 'center', color: '#fff', fontFamily: 'Viral-Black', fontSize: 22, paddingHorizontal: 20 },
  idCard: {
    width: ID_CARD_WIDTH,
    alignSelf: 'center',
    borderRadius: 24,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: '#FFF7E1',
    borderWidth: 3,
    borderColor: '#111827',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  idCardTopBar: {
    backgroundColor: '#FFD60A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#111827',
  },
  idCardBrand: { fontFamily: 'Viral-Black', color: '#111827', fontSize: 16, letterSpacing: 2 },
  idCardBrandSub: { fontFamily: 'Viral-Black', color: '#111827', fontSize: 10, letterSpacing: 2, opacity: 0.7 },
  idCardBody: {
    flexDirection: 'row',
    padding: 14,
    gap: 14,
    alignItems: 'flex-start',
  },
  idCardPhotoFrame: {
    width: 92,
    height: 116,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#111827',
    backgroundColor: '#FF9F0A',
    overflow: 'hidden',
  },
  idCardPhoto: { width: '100%', height: '100%' },
  idCardFields: { flex: 1, paddingTop: 2 },
  idCardFieldLabel: { color: 'rgba(17,24,39,0.55)', fontSize: 10, letterSpacing: 2, fontFamily: 'Viral-Black', marginBottom: 2 },
  idCardInput: {
    color: '#111827',
    fontFamily: 'Viral-Black',
    fontSize: 22,
    paddingVertical: Platform.OS === 'ios' ? 6 : 2,
    paddingHorizontal: 0,
    letterSpacing: 1,
    includeFontPadding: false,
  },
  idCardUnderline: { height: 2, backgroundColor: '#111827', borderRadius: 2, marginBottom: 12 },
  idCardMetaRow: { flexDirection: 'row', gap: 14 },
  idCardMetaCol: { flex: 1 },
  idCardMetaLabel: { color: 'rgba(17,24,39,0.55)', fontSize: 9, letterSpacing: 2, fontFamily: 'Viral-Black', marginBottom: 2 },
  idCardMetaValue: { color: '#111827', fontSize: 12, letterSpacing: 1, fontFamily: 'Viral-Black' },
  idCardBottomStripe: { height: 14, backgroundColor: '#FF2D55', borderTopWidth: 3, borderTopColor: '#111827' },
  bottomControls: { position: 'absolute', left: 24, right: 24, bottom: 0, gap: 10 },
  indicators: { flexDirection: 'row', justifyContent: 'center', gap: 8, height: 10, alignItems: 'center' },
  indicator: { height: 8, borderRadius: 999, backgroundColor: '#fff' },
  helper: { textAlign: 'center', color: 'rgba(255,255,255,0.54)', fontSize: 12, fontWeight: '700' },
  helperSpace: { height: 15 },
  primaryButton: { height: 58, borderRadius: 24, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#0A84FF', shadowOpacity: 0.42, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  primaryButtonPressed: { transform: [{ scale: 0.98 }] },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: '#fff', fontFamily: 'Viral-Black', fontSize: 18 },
});
