import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  interpolate,
  Extrapolate,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';

import { Colors, Typography } from '../src/theme/Colors';
import { AppBackgroundView } from '@/src/components/AppBackgroundView';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GlowView } from '@/src/components/ui/GlowView';

// Platform-safe BlurView
let BlurViewComponent: any = null;
if (Platform.OS === 'ios') {
  try { BlurViewComponent = require('expo-blur').BlurView; } catch {}
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BouncingIcon = ({ children, active }: { children: React.ReactNode; active: boolean }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withSequence(
        withSpring(1.2, { damping: 5, stiffness: 200 }),
        withSpring(1, { damping: 5, stiffness: 200 })
      );
    }
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setHasCompletedOnboarding, setPlayerName } = useSettingsStore();

  const [currentPage, setCurrentPage] = useState(0);
  const [name, setName] = useState('');
  
  const scrollViewRef = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);
  const scrollX = useSharedValue(0);

  useEffect(() => {
    if (currentPage === 2) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    }
  }, [currentPage]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleMomentumScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  const goToNextPage = () => {
    if (currentPage < 2) {
      const nextPage = currentPage + 1;
      scrollViewRef.current?.scrollTo({ x: nextPage * SCREEN_WIDTH, animated: true });
      setCurrentPage(nextPage);
    }
  };

  const handleNameChange = useCallback((text: string) => {
    setName(text);
  }, []);

  const handleComplete = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    
    Keyboard.dismiss();
    setPlayerName(trimmed);
    setHasCompletedOnboarding(true);
    // Explicitly navigate — don't rely on _layout auto-redirect
    router.replace('/auth');
  };

  // Pages are defined outside the component (see below) to prevent re-mounting on state change

  const isNameValid = name.trim().length >= 2;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <AppBackgroundView />
          
          <Animated.ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            keyboardShouldPersistTaps="handled"
          >
            <WelcomePage currentPage={currentPage} />
            <ShowcasePage currentPage={currentPage} />
            <NameEntryPage
              currentPage={currentPage}
              inputRef={inputRef}
              name={name}
              onChangeName={handleNameChange}
            />
          </Animated.ScrollView>

          {/* Bottom Controls */}
          <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 48 }]}>
            <View style={styles.indicators}>
              {[0, 1, 2].map((i) => {
                const indicatorStyle = useAnimatedStyle(() => {
                  const width = interpolate(
                    scrollX.value,
                    [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH],
                    [8, 28, 8],
                    Extrapolate.CLAMP
                  );
                  const opacity = interpolate(
                    scrollX.value,
                    [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH],
                    [0.25, 1, 0.25],
                    Extrapolate.CLAMP
                  );
                  return { width, opacity };
                });
                return <Animated.View key={i} style={[styles.indicator, indicatorStyle]} />;
              })}
            </View>

            <View style={styles.actionRow}>
              {currentPage < 2 ? (
                <View style={styles.nextButtonWrapper}>
                  <TouchableOpacity style={styles.nextButton} onPress={goToNextPage}>
                    <Text style={styles.nextButtonText}>Next</Text>
                    <IconSymbol name="chevron.right" size={12} color="white" weight="bold" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.playButton, !isNameValid && styles.playButtonDisabled]}
                  disabled={!isNameValid}
                  onPress={handleComplete}
                >
                  <LinearGradient
                    colors={isNameValid ? [Colors.purple, Colors.pink] : ['rgba(150,150,150,0.6)', 'rgba(150,150,150,0.5)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.playButtonText}>Let's Play!</Text>
                  <IconSymbol name="play.fill" size={16} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// --- Page 1: Welcome (defined outside to prevent re-mounting) ---
const WelcomePage = React.memo(({ currentPage }: { currentPage: number }) => (
  <View style={styles.page}>
    <View style={styles.iconSection}>
      <GlowView color="rgba(0, 122, 255, 0.6)" size={320} style={{ position: 'absolute' }} />
      <BouncingIcon active={currentPage === 0}>
        <LinearGradient
          colors={[Colors.blue, Colors.cyan]}
          style={styles.iconGradient}
        >
          <IconSymbol name="gamecontroller.fill" size={68} color="white" />
        </LinearGradient>
      </BouncingIcon>
    </View>
    <View style={styles.textSection}>
      <Text style={styles.title2}>Welcome to</Text>
      <Text style={styles.viralTitle}>PlayVirals</Text>
      <Text style={styles.bodyText}>
        The ultimate party game collection.{'\n'}Play with friends, compete, and have fun!
      </Text>
    </View>
  </View>
));

// --- Page 2: Showcase ---
const ShowcasePage = React.memo(({ currentPage }: { currentPage: number }) => (
  <View style={styles.page}>
    <View style={styles.iconSection}>
      <GlowView color="rgba(52, 199, 89, 0.6)" size={320} style={{ position: 'absolute' }} />
      <BouncingIcon active={currentPage === 1}>
        <LinearGradient
          colors={[Colors.green, Colors.mint]}
          style={styles.iconGradient}
        >
          <IconSymbol name="sparkles" size={68} color="white" />
        </LinearGradient>
      </BouncingIcon>
    </View>
    <View style={styles.textSection}>
      <Text style={styles.showcaseTitle}>All the Viral Games</Text>
      <Text style={styles.title1}>In One Place</Text>
      <Text style={styles.bodyText}>
        Every trending party game you've seen{'\n'}on social media — ready to play instantly{'\n'}with your friends. No setup needed.
      </Text>
      <View style={styles.pillsRow}>
        <FeaturePill icon="person.3.fill" text="Multiplayer" />
        <FeaturePill icon="iphone" text="One Device" />
        <FeaturePill icon="bolt.fill" text="Instant" />
      </View>
    </View>
  </View>
));

// --- Page 3: Name Entry ---
interface NameEntryPageProps {
  currentPage: number;
  inputRef: React.RefObject<TextInput | null>;
  name: string;
  onChangeName: (text: string) => void;
}

const NameEntryPage = React.memo(({ currentPage, inputRef, name, onChangeName }: NameEntryPageProps) => (
  <View style={styles.page}>
    <View style={styles.iconSection}>
      <GlowView color="rgba(175, 82, 222, 0.6)" size={320} style={{ position: 'absolute' }} />
      <BouncingIcon active={currentPage === 2}>
        <LinearGradient
          colors={[Colors.purple, Colors.pink]}
          style={styles.iconGradient}
        >
          <IconSymbol name="person.crop.circle.badge.plus" size={60} color="white" />
        </LinearGradient>
      </BouncingIcon>
    </View>
    <View style={styles.textSection}>
      <Text style={styles.title1}>What's Your Name?</Text>
      <Text style={styles.bodyText}>
        This will be your default player name{'\n'}in party games.
      </Text>
      
      <View style={styles.inputWrapper}>
        <View style={styles.inputContainer}>
          {Platform.OS === 'ios' && BlurViewComponent ? (
            <BlurViewComponent intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,20,30,0.92)' }]} />
          )}
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={name}
            onChangeText={onChangeName}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>
        <Text style={styles.caption}>You can change this anytime</Text>
      </View>
    </View>
  </View>
));

const FeaturePill = ({ icon, text }: { icon: any; text: string }) => (
  <View style={styles.pill}>
    <IconSymbol name={icon} size={20} color={Colors.mint} weight="semibold" />
    <Text style={styles.pillText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  page: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
  },
  iconSection: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    transform: [{ scale: 1.5 }],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 30,
      },
    }),
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.blue,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
    }),
  },
  textSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 20,
  },
  title2: {
    fontSize: 22,
    fontWeight: '500',
    color: Colors.secondary,
    marginBottom: 14,
  },
  viralTitle: {
    fontFamily: Typography.viralTitle.fontFamily,
    fontSize: 34,
    color: Colors.white,
    marginBottom: 4,
  },
  title1: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 14,
  },
  showcaseTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.mint,
    marginBottom: 10,
    textAlign: 'center',
  },
  bodyText: {
    fontSize: 16,
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 16,
  },
  pill: {
    alignItems: 'center',
    gap: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary,
  },
  inputWrapper: {
    width: '100%',
    marginTop: 28,
    alignItems: 'center',
  },
  inputContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderColor: Colors.purple,
    borderWidth: 1.5,
  },
  input: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  caption: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.tertiary,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    gap: 20,
  },
  indicators: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  indicator: {
    height: 8,
    backgroundColor: Colors.white,
    borderRadius: 4,
  },
  actionRow: {
    height: 56,
    justifyContent: 'center',
  },
  nextButtonWrapper: {
    alignItems: 'flex-end',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.blue,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 24,
    gap: 6,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    height: 56,
    gap: 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Colors.purple,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  playButtonDisabled: {
    shadowOpacity: 0,
  },
  playButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: 'bold',
  },
});

