import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AppBackgroundView } from '@/src/components/AppBackgroundView';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CardCategoriesList } from '@/src/models/CardModels';
import { PARTY_TOOLS, PartyToolType } from '@/src/components/tools/PartyToolsSection';

export default function ToolsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showSaved, setShowSaved] = useState<boolean>(false);

  const handleToolPress = (id: PartyToolType) => {
    router.push(`/(tools)/${id}` as any);
  };

  return (
    <View style={styles.container}>
      <AppBackgroundView />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 6, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tools</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => setShowSaved((v) => !v)}
            activeOpacity={0.85}
            style={styles.iconButton}
          >
            <IconSymbol
              name={showSaved ? 'bookmark.fill' : 'bookmark'}
              size={18}
              color="white"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            activeOpacity={0.85}
            style={styles.iconButton}
          >
            <IconSymbol name="person.crop.circle" size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* Section: Party Tools */}
        <Text style={styles.sectionTitle}>Party Tools</Text>
        <Text style={styles.sectionSubtitle}>Quick utilities to spice up the round.</Text>
        <View style={styles.sectionCard}>
          {PARTY_TOOLS.map((tool, index) => (
            <View key={tool.id}>
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => handleToolPress(tool.id)}
              >
                <View style={[styles.rowIcon, { backgroundColor: tool.tint + '22' }]}>
                  <IconSymbol name={tool.icon} size={18} color={tool.tint} weight="bold" />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{tool.title}</Text>
                  <Text style={styles.rowSubtitle}>{tool.subtitle}</Text>
                </View>
                <IconSymbol name="chevron.right" size={14} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
              {index < PARTY_TOOLS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Section: Card Decks */}
        <Text style={styles.sectionTitle}>Card Decks</Text>
        <Text style={styles.sectionSubtitle}>Ready to play. Tap any deck to start.</Text>
        <View style={styles.sectionCard}>
          {CardCategoriesList.map((category, index) => (
            <View key={category.id}>
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => router.push(`/cards/${category.id}` as any)}
              >
                <View style={[styles.rowIcon, { backgroundColor: category.accentColor + '22' }]}>
                  <IconSymbol
                    name={category.icon as any}
                    size={18}
                    color={category.accentColor}
                  />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{category.title}</Text>
                  <Text style={styles.rowSubtitle}>{category.subtitle}</Text>
                </View>
                <IconSymbol name="chevron.right" size={14} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
              {index < CardCategoriesList.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
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
    marginBottom: 24,
    gap: 10,
  },
  headerTitle: {
    fontFamily: 'Viral-Black',
    fontSize: 28,
    color: 'white',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sectionTitle: {
    fontFamily: 'Viral-Black',
    fontSize: 18,
    color: 'white',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 12,
    ...(Platform.OS === 'web' ? {} : { fontWeight: '500' as const }),
  },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 4,
    marginBottom: 24,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: 'Viral-Black',
    fontSize: 16,
    color: 'white',
  },
  rowSubtitle: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 14 + 38 + 14,
  },
});
