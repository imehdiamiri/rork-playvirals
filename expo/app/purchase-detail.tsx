import { Colors } from '@/src/theme/Colors';
import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { AppBackgroundView } from '@/src/components/AppBackgroundView';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GlowView } from '@/src/components/ui/GlowView';
import { usePaywallStore } from '@/src/store/usePaywallStore';
import { showToast } from '@/src/components/ToastOverlay';

/**
 * PurchaseDetailScreen — matches iOS PurchaseDetailView.swift
 * Detailed product info sheet for subscriptions and star packs.
 */

// ─── Types ───

type SubscriptionTier = 'weekly' | 'monthly' | 'yearly' | 'lifetime';
type PurchaseSelection =
  | { kind: 'subscription'; tier: SubscriptionTier }
  | { kind: 'starPack'; stars: number };

const TIER_CONFIG: Record<SubscriptionTier, {
  displayName: string;
  icon: string;
  accentColor: string;
  starsPerPeriod: number;
  defaultPrice: string;
}> = {
  weekly: { displayName: 'Weekly', icon: 'flame.fill', accentColor: '#FF6B6B', starsPerPeriod: 15, defaultPrice: '$4.99' },
  monthly: { displayName: 'Monthly', icon: 'star.fill', accentColor: '#4ECDC4', starsPerPeriod: 75, defaultPrice: '$6.99' },
  yearly: { displayName: 'Yearly', icon: 'crown.fill', accentColor: '#FFD93D', starsPerPeriod: 500, defaultPrice: '$29.99' },
  lifetime: { displayName: 'Lifetime', icon: 'infinity', accentColor: '#C084FC', starsPerPeriod: 1000, defaultPrice: '$49.99' },
};

const STAR_PACK_PRICES: Record<number, { price: string; savePercent?: number }> = {
  50: { price: '$0.99' },
  200: { price: '$2.99', savePercent: 25 },
  400: { price: '$4.99', savePercent: 37 },
  1000: { price: '$9.99', savePercent: 50 },
};

// ─── Helpers ───

function getAccent(selection: PurchaseSelection): string {
  if (selection.kind === 'subscription') return TIER_CONFIG[selection.tier].accentColor;
  return Colors.orange;
}

function getIcon(selection: PurchaseSelection): string {
  if (selection.kind === 'subscription') return TIER_CONFIG[selection.tier].icon;
  return 'star.fill';
}

function getTitle(selection: PurchaseSelection): string {
  if (selection.kind === 'subscription') return TIER_CONFIG[selection.tier].displayName;
  return `${selection.stars} Stars`;
}

function getSubtitle(selection: PurchaseSelection): string {
  if (selection.kind === 'subscription') {
    return selection.tier === 'lifetime'
      ? 'One-time • Forever access'
      : `Auto-renews every ${TIER_CONFIG[selection.tier].displayName.toLowerCase()}`;
  }
  return 'One-time purchase';
}

function getPrice(selection: PurchaseSelection): string {
  if (selection.kind === 'subscription') return TIER_CONFIG[selection.tier].defaultPrice;
  return STAR_PACK_PRICES[selection.stars]?.price ?? '—';
}

interface Benefit {
  icon: string;
  color: string;
  text: string;
}

function getBenefits(selection: PurchaseSelection): Benefit[] {
  if (selection.kind === 'subscription') {
    const tier = TIER_CONFIG[selection.tier];
    const items: Benefit[] = [
      { icon: 'star.fill', color: Colors.orange, text: `+${tier.starsPerPeriod} Stars ${selection.tier === 'lifetime' ? 'once' : 'per period'}` },
      { icon: 'gamecontroller.fill', color: '#007AFF', text: 'All 4 Premium games unlocked' },
      { icon: 'sparkles', color: Colors.yellow, text: 'AI cards cost just 1 Star instead of 5' },
    ];
    if (selection.tier === 'yearly') items.push({ icon: 'tag.fill', color: Colors.green, text: 'Best value — save vs monthly' });
    if (selection.tier === 'lifetime') items.push({ icon: 'infinity', color: '#FF2D55', text: 'Pay once, keep forever' });
    items.push({ icon: 'sparkles', color: '#AF52DE', text: 'Support ongoing development' });
    return items;
  }

  const items: Benefit[] = [
    { icon: 'star.fill', color: Colors.orange, text: `+${selection.stars} Stars added to your wallet` },
    { icon: 'sparkles', color: Colors.yellow, text: 'Spend Stars on AI-generated cards' },
    { icon: 'bolt.fill', color: '#007AFF', text: 'Instant delivery after purchase' },
  ];
  const save = STAR_PACK_PRICES[selection.stars]?.savePercent;
  if (save) items.push({ icon: 'tag.fill', color: Colors.green, text: `Save ${save}% vs the starter pack` });
  return items;
}

function getBuyLabel(selection: PurchaseSelection, price: string): string {
  if (selection.kind === 'subscription') {
    return selection.tier === 'lifetime' ? `Buy Lifetime — ${price}` : `Subscribe — ${price}`;
  }
  return `Buy — ${price}`;
}

function getLegalText(selection: PurchaseSelection): string {
  if (selection.kind === 'subscription' && selection.tier !== 'lifetime') {
    return 'Subscriptions auto-renew unless cancelled 24h before period end. Payment is charged to your Apple ID. Stars remain in your wallet after subscription ends.';
  }
  return 'Payment is charged to your Apple ID. Stars are non-refundable and can only be used in this app.';
}

// ─── Component ───

export default function PurchaseDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPurchasing, restorePurchases } = usePaywallStore();

  // For now, default to yearly sub. In production, this would be passed via route params.
  const [selection] = useState<PurchaseSelection>({ kind: 'subscription', tier: 'yearly' });

  const accent = getAccent(selection);
  const icon = getIcon(selection);
  const title = getTitle(selection);
  const subtitle = getSubtitle(selection);
  const price = getPrice(selection);
  const benefits = getBenefits(selection);
  const buyLabel = getBuyLabel(selection, price);
  const legalText = getLegalText(selection);

  const handlePurchase = async () => {
    // In production, resolve the package from usePaywallStore and call purchasePackage
    showToast.info('Purchase flow will be activated with RevenueCat keys.');
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) {
      showToast.success('Purchases restored!');
      if (router.canGoBack()) { router.back(); } else { router.replace('/'); }
    }
  };

  return (
    <View style={styles.container}>
      <AppBackgroundView />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity 
          onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/'); } }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingVertical: 6,
          }}
        >
          <IconSymbol name="xmark" size={14} color="#007AFF" />
          <Text style={{ color: '#007AFF', fontSize: 17, fontWeight: '400', marginLeft: 4 }}>Close</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 50, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <GlowView color={accent} size={180} style={{ position: 'absolute' }} />
            <LinearGradient
              colors={[accent, `${accent}B0`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <IconSymbol name={icon as any} size={42} color="#fff" />
            </LinearGradient>
          </View>

          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroSubtitle}>{subtitle}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{price}</Text>
            {selection.kind === 'subscription' && selection.tier !== 'lifetime' && (
              <Text style={styles.pricePer}>/ {TIER_CONFIG[selection.tier].displayName.toLowerCase()}</Text>
            )}
          </View>
        </View>

        {/* Benefits Card */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsLabel}>WHAT YOU GET</Text>
          {benefits.map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: `${b.color}28` }]}>
                <IconSymbol name={b.icon as any} size={16} color={b.color} />
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        {/* Buy Button */}
        <TouchableOpacity
          style={[styles.buyBtn, isPurchasing && styles.buyBtnDisabled]}
          onPress={handlePurchase}
          disabled={isPurchasing}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[accent, `${accent}C0`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buyGradient}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : null}
            <Text style={styles.buyText}>{buyLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Legal */}
        <Text style={styles.legalText}>{legalText}</Text>

        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.playvirals.com/privacy')}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.playvirals.com/terms')}>
            <Text style={styles.linkText}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
  },
  priceText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
  },
  pricePer: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    marginLeft: 6,
  },
  benefitsCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 20,
  },
  benefitsLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  buyBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
  },
  buyBtnDisabled: {
    opacity: 0.55,
  },
  buyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  buyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  restoreBtn: {
    alignItems: 'center',
    marginBottom: 20,
  },
  restoreText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.35)',
  },
  legalText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 10,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  linkText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.35)',
  },
  legalDot: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
  },
});
