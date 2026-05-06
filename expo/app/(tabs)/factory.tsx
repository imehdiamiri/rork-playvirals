import { Colors } from '@/src/theme/Colors';
import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { AppBackgroundView } from '@/src/components/AppBackgroundView';
import { LiquidGlass } from '@/src/components/LiquidGlass';
import { IconSymbol } from '@/components/ui/icon-symbol';
import Animated from 'react-native-reanimated';

// Platform-safe BlurView
let BlurViewComponent: any = null;
if (Platform.OS === 'ios') {
  try { BlurViewComponent = require('expo-blur').BlurView; } catch {}
}
const SurfaceBlur = ({ style, children, intensity = 25 }: any) => {
  if (Platform.OS === 'ios' && BlurViewComponent) {
    return <BlurViewComponent intensity={intensity} tint="dark" style={style}>{children}</BlurViewComponent>;
  }
  return <View style={[style, { backgroundColor: 'rgba(20,20,30,0.92)' }]}>{children}</View>;
};

// Game Vibes definitions
const GAME_VIBES = [
  { id: 'couple', title: 'Couple', icon: 'heart.fill', color: '#FF2D55' },
  { id: 'funny', title: 'Funny', icon: 'face.smiling.fill', color: Colors.yellow },
  { id: 'memory', title: 'Memory', icon: 'brain.head.profile', color: '#5AC8FA' },
  { id: 'action', title: 'Action', icon: 'figure.run', color: Colors.orange },
  { id: 'cards', title: 'Cards', icon: 'suit.club.fill', color: '#007AFF' },
  { id: 'trivia', title: 'Trivia', icon: 'questionmark.circle.fill', color: '#00C7BE' },
  { id: 'roleplay', title: 'Roleplay', icon: 'theatermasks.fill', color: '#AF52DE' },
  { id: 'challenge', title: 'Challenge', icon: 'flame.fill', color: Colors.red },
];

// Built-in starter ideas — shown when LLM is not configured
const STARTER_IDEAS = [
  {
    id: '1',
    title: 'Laugh Out Loud',
    description: 'A hilarious game of quick wits.',
    steps: ['Gather friends', 'Pick a card', 'Act it out', 'Laugh!'],
    tags: ['Fast', 'Groups'],
  },
  {
    id: '2',
    title: 'Silent Charades',
    description: 'Communicate without making a sound.',
    steps: ['Choose a category', 'Take turns acting', 'Guess the answer before the timer runs out'],
    tags: ['Silent', 'Acting'],
  }
];

export default function FactoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [vibe, setVibe] = useState(GAME_VIBES[1]); // Default funny
  const [playerCount, setPlayerCount] = useState(4);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [expandedIdeaId, setExpandedIdeaId] = useState<string | null>(null);

  const minPlayers = 2;
  const maxPlayers = 20;

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const { isLLMConfigured, complete, stripCodeFences } = await import('@/src/services/LLMService');

      if (!isLLMConfigured()) {
        // Use built-in starter ideas when no API key is set
        setIdeas(STARTER_IDEAS);
        setExpandedIdeaId(STARTER_IDEAS[0].id);
        setIsGenerating(false);
        return;
      }

      const systemPrompt = `You are a creative party game designer. Generate 2-3 unique party game ideas as JSON array. Each object: { "id": unique_string, "title": string, "description": one_sentence, "steps": string_array_3_to_5, "tags": string_array_2 }. Return ONLY valid JSON.`;
      const userPrompt = `Create party games for ${playerCount} players with a "${vibe.title}" vibe.${prompt ? ` Theme: ${prompt}` : ''}`;

      const raw = await complete(systemPrompt, userPrompt);
      const parsed = JSON.parse(stripCodeFences(raw));
      const results = Array.isArray(parsed) ? parsed : [parsed];
      setIdeas(results);
      if (results.length > 0) setExpandedIdeaId(results[0].id);
    } catch (err: any) {
      console.warn('AI generation failed, using fallback ideas:', err.message);
      setIdeas(STARTER_IDEAS);
      setExpandedIdeaId(STARTER_IDEAS[0].id);
    }

    setIsGenerating(false);
  };

  return (
    <View style={styles.container}>
      <AppBackgroundView />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 6, paddingBottom: 120 }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Factory</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.85}>
            <LiquidGlass variant="mid" radius={20} style={styles.profileButton} shadow={false}>
              <IconSymbol name="person.crop.circle" size={22} color="white" />
            </LiquidGlass>
          </TouchableOpacity>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCardWrapper}>
          <LinearGradient
            colors={['rgba(175, 82, 222, 0.55)', 'rgba(0, 122, 255, 0.35)', 'rgba(255, 45, 85, 0.25)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroCardContent}>
              <View style={styles.aiBadge}>
                <IconSymbol name="sparkles" size={10} color="rgba(255,255,255,0.9)" />
                <Text style={styles.aiBadgeText}>AI POWERED</Text>
              </View>

              <Text style={styles.heroTitle}>Invent your{'\n'}next party game</Text>
              <Text style={styles.heroSubtitle}>
                Pick a vibe, set your crew, and we&apos;ll cook up fresh games in seconds.
              </Text>
            </View>

            <View style={styles.heroIconWrapper}>
              <IconSymbol name="wand.and.stars" size={80} color="rgba(255,255,255,0.12)" style={{ transform: [{ rotate: '12deg' }] }} />
            </View>
          </LinearGradient>
        </View>

        {/* Vibe Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.vibeHeader}>
            <Text style={styles.sectionTitle}>Choose a vibe</Text>
            <Text style={[styles.selectedVibeText, { color: vibe.color }]}>{vibe.title}</Text>
          </View>
          
          <View style={styles.vibeGrid}>
            {GAME_VIBES.map((v) => {
              const isSelected = vibe.id === v.id;
              return (
                <TouchableOpacity 
                  key={v.id} 
                  style={[
                    styles.vibeTile,
                    isSelected ? { borderColor: 'rgba(255,255,255,0.25)' } : { borderColor: `${v.color}38` }
                  ]}
                  onPress={() => setVibe(v)}
                  activeOpacity={0.7}
                >
                  {Platform.OS === 'ios' && BlurViewComponent ? (
                    <BlurViewComponent tint="dark" intensity={isSelected ? 40 : 20} style={StyleSheet.absoluteFill} />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: isSelected ? `${v.color}40` : 'rgba(20,20,30,0.92)' }]} />
                  )}
                  <LinearGradient
                    colors={isSelected ? [v.color, `${v.color}B3`] : ['transparent', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.vibeTileGradient}
                  >
                    <IconSymbol name={v.icon as any} size={16} color={isSelected ? 'white' : v.color} />
                    <Text style={[styles.vibeTileText, { color: isSelected ? 'white' : 'rgba(255,255,255,0.85)' }]} numberOfLines={1}>
                      {v.title}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Players and Details */}
        <View style={styles.detailsContainer}>
          {/* Players Card */}
          <SurfaceBlur intensity={30} style={[styles.surfaceCard, { overflow: 'hidden' }]}>
            <View style={styles.playersRow}>
              <IconSymbol name="person.2.fill" size={18} color={Colors.green} />
              <Text style={styles.playersLabel}>Players</Text>
              <View style={{ flex: 1 }} />
              
              <TouchableOpacity 
                style={[styles.stepperButton, playerCount <= minPlayers && styles.stepperDisabled]} 
                onPress={() => setPlayerCount(Math.max(minPlayers, playerCount - 1))}
                disabled={playerCount <= minPlayers}
              >
                <IconSymbol name="minus" size={14} color={Colors.green} />
              </TouchableOpacity>
              
              <Text style={styles.playerCount}>{playerCount}</Text>
              
              <TouchableOpacity 
                style={[styles.stepperButton, playerCount >= maxPlayers && styles.stepperDisabled]} 
                onPress={() => setPlayerCount(Math.min(maxPlayers, playerCount + 1))}
                disabled={playerCount >= maxPlayers}
              >
                <IconSymbol name="plus" size={14} color={Colors.green} />
              </TouchableOpacity>
            </View>
          </SurfaceBlur>

          {/* Context Card */}
          <SurfaceBlur intensity={30} style={[styles.surfaceCard, { overflow: 'hidden' }]}>
            <View style={styles.contextHeader}>
              <IconSymbol name="text.alignleft" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={styles.contextLabel}>Context</Text>
            </View>
            <View style={styles.contextInputWrapper}>
              <TextInput
                style={styles.contextInput}
                placeholder="e.g. road trip, birthday, couples…"
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                numberOfLines={3}
                value={prompt}
                onChangeText={setPrompt}
              />
            </View>
          </SurfaceBlur>
        </View>

        {/* Generate Button */}
        <TouchableOpacity style={styles.generateButtonWrapper} onPress={handleGenerate} disabled={isGenerating}>
          <LinearGradient
            colors={['#AF52DE', Colors.blue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.generateButton}
          >
            <IconSymbol name="sparkles" size={18} color="white" />
            <Text style={styles.generateButtonText}>
              {isGenerating ? "Generating…" : "Generate Ideas"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Results Section */}
        <View style={styles.resultsSection}>
          {ideas.length === 0 && !isGenerating ? (
            <View style={styles.emptyResults}>
              <View style={styles.emptyIconWrapper}>
                <LinearGradient
                  colors={['rgba(175, 82, 222, 0.3)', 'rgba(0, 122, 255, 0.2)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.emptyIconBg}
                />
                <IconSymbol name="sparkles.rectangle.stack.fill" size={30} color="rgba(255,255,255,0.9)" />
              </View>
              <Text style={styles.emptyResultsTitle}>Ready when you are</Text>
              <Text style={styles.emptyResultsText}>
                Tap Generate to craft brand new games tailored to your crew.
              </Text>
            </View>
          ) : (
            <View style={styles.resultsContainer}>
              {ideas.length > 0 && (
                <View style={styles.resultsHeader}>
                  <Text style={styles.sectionTitle}>Your Ideas</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{ideas.length}</Text>
                  </View>
                </View>
              )}
              
              {ideas.map((idea) => {
                const isExpanded = expandedIdeaId === idea.id;
                return (
                  <Animated.View key={idea.id} style={[styles.surfaceCard, { padding: 0, overflow: 'hidden', shadowColor: '#AF52DE', borderColor: isExpanded ? 'rgba(175, 82, 222, 0.4)' : 'rgba(255,255,255,0.05)' }]}>
                    {Platform.OS === 'ios' && BlurViewComponent ? (
                      <BlurViewComponent tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,20,30,0.92)' }]} />
                    )}
                    <View style={{ padding: 14 }}>
                      <View style={styles.ideaHeaderRow}>
                        <View style={styles.ideaIcon}>
                          <IconSymbol name="sparkle" size={18} color={Colors.yellow} />
                        </View>
                        <View style={styles.ideaTexts}>
                          <Text style={styles.ideaTitle}>{idea.title}</Text>
                          <Text style={styles.ideaDescription}>{idea.description}</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.expandButton}
                          onPress={() => setExpandedIdeaId(isExpanded ? null : idea.id)}
                        >
                          <IconSymbol 
                            name="chevron.down" 
                            size={20} 
                            color="rgba(255,255,255,0.6)" 
                            style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                          />
                        </TouchableOpacity>
                      </View>

                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        {idea.steps.map((step: string, i: number) => (
                          <View key={i} style={styles.stepRow}>
                            <View style={styles.stepBadge}>
                              <Text style={styles.stepBadgeText}>{i + 1}</Text>
                            </View>
                            <Text style={styles.stepText}>{step}</Text>
                          </View>
                        ))}
                        
                        {idea.tags && idea.tags.length > 0 && (
                          <View style={styles.tagsRow}>
                            {idea.tags.map((tag: string) => (
                              <View key={tag} style={styles.tagBadge}>
                                <Text style={styles.tagText}>{tag}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  title: {
    fontFamily: 'Viral-Black',
    fontSize: 25,
    color: 'white',
  },
  profileButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCardWrapper: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#AF52DE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  heroCard: {
    padding: 18,
    minHeight: 160,
  },
  heroCardContent: {
    position: 'relative',
    zIndex: 2,
    alignItems: 'flex-start',
    gap: 10,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  aiBadgeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: 'white',
    fontSize: 28,
    fontFamily: 'Viral-Black',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  heroIconWrapper: {
    position: 'absolute',
    right: -20,
    top: 20,
    opacity: 0.8,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  vibeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Viral-Black',
    color: 'white',
    fontSize: 16,
  },
  selectedVibeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  vibeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vibeTile: {
    width: '23%', // approx 4 items per row accounting for gap
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  vibeTileGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  vibeTileText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailsContainer: {
    gap: 14,
    marginBottom: 20,
  },
  surfaceCard: {
    backgroundColor: 'transparent',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playersLabel: {
    color: Colors.green,
    fontSize: 15,
    fontWeight: '600',
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperDisabled: {
    opacity: 0.3,
  },
  playerCount: {
    color: Colors.green,
    fontSize: 20,
    fontWeight: 'bold',
    minWidth: 28,
    textAlign: 'center',
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  contextLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contextInputWrapper: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  contextInput: {
    color: 'white',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  generateButtonWrapper: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#AF52DE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
    marginBottom: 20,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  resultsSection: {
    marginTop: 10,
  },
  emptyResults: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 14,
  },
  emptyIconWrapper: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  emptyIconBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
  },
  emptyResultsTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyResultsText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  resultsContainer: {
    gap: 12,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ideaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  ideaIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 204, 0, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ideaTexts: {
    flex: 1,
    gap: 3,
  },
  ideaTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  ideaDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  expandButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedContent: {
    marginTop: 16,
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    color: Colors.blue,
    fontSize: 11,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '600',
  },
});

