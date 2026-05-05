import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GameDefinition, GameModeDetails } from '@/src/models/AppModels';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface GameCardViewProps {
  gameDef: GameDefinition;
  isLocked?: boolean;
  style?: ViewStyle;
}

export function GameCardView({ gameDef, isLocked = false, style }: GameCardViewProps) {
  const { id: game, accentName } = gameDef;

  const gradientColors = getGradientColors(accentName);
  const accentColor = getAccentColor(accentName);

  return (
    <View style={[styles.container, style]}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />

      <View style={styles.content}>
        <View style={styles.spacer} />

        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
          {game.name}
        </Text>

        <View style={styles.smallSpacer} />

        <View style={styles.iconContainer}>
          <IconSymbol name={game.symbolName as any} size={32} color="white" />
        </View>

        <View style={styles.tinySpacer} />

        <View style={styles.modesRow}>
          {game.supportedModes.map((mode) => {
            const details = GameModeDetails[mode];
            return (
              <View key={mode} style={styles.modeIconContainer}>
                <IconSymbol name={details.icon as any} size={9} color="rgba(255,255,255,0.6)" />
              </View>
            );
          })}
        </View>

        <Text style={styles.playerCountText}>{`${game.minPlayers}–${game.maxPlayers} players`}</Text>

        <View style={styles.spacer} />
      </View>

      <View style={[styles.borderOverlay, { borderColor: accentColor }]} />

      {isLocked && (
        <View style={styles.lockContainer}>
          <IconSymbol name="lock.fill" size={13} color="white" />
        </View>
      )}
    </View>
  );
}

function getGradientColors(accentName: string): [string, string, ...string[]] {
  switch (accentName) {
    case 'pink':
      return ['rgba(255,45,85,0.95)', 'rgba(255,59,48,0.65)', 'rgba(175,82,222,0.5)'];
    case 'cyan':
      return ['rgba(50,173,230,0.95)', 'rgba(0,199,190,0.7)', 'rgba(0,122,255,0.5)'];
    case 'teal':
      return ['rgba(48,176,199,0.95)', 'rgba(52,199,89,0.7)', 'rgba(0,199,190,0.45)'];
    case 'orange':
      return ['rgba(255,149,0,0.96)', 'rgba(255,59,48,0.72)', 'rgba(255,204,0,0.4)'];
    case 'red':
      return ['rgba(255,59,48,0.95)', 'rgba(255,45,85,0.7)', 'rgba(255,149,0,0.45)'];
    case 'yellow':
      return ['rgba(255,204,0,0.96)', 'rgba(255,149,0,0.72)', 'rgba(255,59,48,0.4)'];
    case 'purple':
      return ['rgba(175,82,222,0.95)', 'rgba(88,86,214,0.8)', 'rgba(255,45,85,0.45)'];
    default:
      return ['rgba(0,122,255,0.95)', 'rgba(88,86,214,0.75)', 'rgba(175,82,222,0.45)'];
  }
}

function getAccentColor(accentName: string): string {
  switch (accentName) {
    case 'pink':
      return 'rgba(255,45,85,0.25)';
    case 'cyan':
      return 'rgba(50,173,230,0.25)';
    case 'teal':
      return 'rgba(48,176,199,0.25)';
    case 'orange':
      return 'rgba(255,149,0,0.25)';
    case 'red':
      return 'rgba(255,59,48,0.25)';
    case 'yellow':
      return 'rgba(255,204,0,0.25)';
    case 'purple':
      return 'rgba(175,82,222,0.25)';
    default:
      return 'rgba(0,122,255,0.25)';
  }
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  smallSpacer: {
    height: 6,
  },
  tinySpacer: {
    height: 4,
  },
  title: {
    fontFamily: 'Viral-Black',
    fontSize: 20,
    color: 'white',
    textAlign: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  modeIconContainer: {
    width: 20,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerCountText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 18,
  },
  lockContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 7,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
