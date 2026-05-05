import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GameDefinition, GameMode, GameModeDetails, getPlayerCountText } from '@/src/models/AppModels';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { platformShadow } from '@/src/theme/Colors';

// Platform-safe BlurView
let BlurView: any = null;
if (Platform.OS === 'ios') {
  try { BlurView = require('expo-blur').BlurView; } catch {}
}

interface GameCardViewProps {
  game: GameDefinition;
  isLocked?: boolean;
}

const getGradientColors = (accentName: string): [string, string, string] => {
  switch (accentName) {
    case 'pink':
      return ['rgba(255, 105, 180, 0.95)', 'rgba(255, 59, 48, 0.65)', 'rgba(175, 82, 222, 0.5)'];
    case 'cyan':
      return ['rgba(50, 173, 230, 0.95)', 'rgba(0, 199, 190, 0.7)', 'rgba(0, 122, 255, 0.5)'];
    case 'teal':
      return ['rgba(48, 176, 199, 0.95)', 'rgba(52, 199, 89, 0.7)', 'rgba(0, 199, 190, 0.45)'];
    case 'orange':
      return ['rgba(255, 149, 0, 0.96)', 'rgba(255, 59, 48, 0.72)', 'rgba(255, 204, 0, 0.4)'];
    case 'red':
      return ['rgba(255, 59, 48, 0.95)', 'rgba(255, 105, 180, 0.7)', 'rgba(255, 149, 0, 0.45)'];
    case 'yellow':
      return ['rgba(255, 204, 0, 0.96)', 'rgba(255, 149, 0, 0.72)', 'rgba(255, 59, 48, 0.4)'];
    case 'purple':
      return ['rgba(175, 82, 222, 0.95)', 'rgba(88, 86, 214, 0.8)', 'rgba(255, 105, 180, 0.45)'];
    default:
      return ['rgba(0, 122, 255, 0.95)', 'rgba(88, 86, 214, 0.75)', 'rgba(175, 82, 222, 0.45)'];
  }
};

const getAccentColor = (accentName: string): string => {
  switch (accentName) {
    case 'pink':
      return 'rgba(255, 105, 180, 1)';
    case 'cyan':
      return 'rgba(50, 173, 230, 1)';
    case 'teal':
      return 'rgba(48, 176, 199, 1)';
    case 'orange':
      return 'rgba(255, 149, 0, 1)';
    case 'red':
      return 'rgba(255, 59, 48, 1)';
    case 'yellow':
      return 'rgba(255, 204, 0, 1)';
    case 'purple':
      return 'rgba(175, 82, 222, 1)';
    default:
      return 'rgba(0, 122, 255, 1)';
  }
};

export const GameCardView: React.FC<GameCardViewProps> = ({ game, isLocked = false }) => {
  const colors = getGradientColors(game.accentName);
  const accentColor = getAccentColor(game.accentName);

  return (
    <View style={[styles.container, { shadowColor: accentColor }]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.content}>
        <View style={styles.spacerTop} />
        
        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>
          {game.id.name}
        </Text>
        
        <View style={styles.spacerMiddle1} />
        
        {/* Icon - clean, no background container */}
        <IconSymbol name={game.id.symbolName as any} size={36} color="rgba(255, 255, 255, 0.95)" />
        
        <View style={styles.spacerMiddle2} />
        
        <View style={styles.modesContainer}>
          {game.id.supportedModes.map((mode) => {
            const modeDetails = GameModeDetails[mode];
            return (
              <View key={mode} style={styles.modePill}>
                <IconSymbol 
                  name={modeDetails.icon as any} 
                  size={11} 
                  color="rgba(255,255,255,0.85)" 
                />
              </View>
            );
          })}
        </View>
        
        <Text style={styles.playerCount}>
          {getPlayerCountText(game.id.minPlayers, game.id.maxPlayers)}
        </Text>
        
        <View style={styles.spacerBottom} />
      </View>

      {isLocked && (
        <View style={styles.lockedOverlay}>
          {Platform.OS === 'ios' && BlurView ? (
            <BlurView tint="dark" intensity={60} style={styles.lockedIconContainer}>
              <IconSymbol name="lock.fill" size={13} color="white" />
            </BlurView>
          ) : (
            <View style={[styles.lockedIconContainer, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}>
              <IconSymbol name="lock.fill" size={13} color="white" />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    ...platformShadow(8, '#000', 0.35, 10),
  },
  content: {
    flex: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacerTop: {
    flex: 1,
    minHeight: 8,
  },
  title: {
    fontFamily: 'Viral-Black',
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    minHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  spacerMiddle1: {
    flex: 0.7,
    minHeight: 6,
  },
  spacerMiddle2: {
    flex: 0.5,
    minHeight: 4,
  },
  modesContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  modePill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerCount: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  spacerBottom: {
    flex: 1,
    minHeight: 8,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  lockedIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
});
