/**
 * Premium lock (SRS §49). Free users see what the feature does and can start the 7-day free trial;
 * Premium (or trial) users see the feature. The plan comes from the server, so this only shapes the UI.
 */
import { hasPremium, PREMIUM_FEATURES, type PremiumFeature } from '@healthx/shared';
import { router } from 'expo-router';
import { Crown, Lock, Sparkles } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';
import { AppText } from './Text';
import { useStore } from '@/lib/store';
import { brandText, colors, palette } from '@/lib/theme';

export function usePremium() {
  const { state } = useStore();
  return hasPremium(state.profile.plan);
}

/** Small "Premium" marker for list rows and headers. */
export function PremiumMark() {
  return (
    <View style={styles.mark} accessibilityLabel="Premium">
      <Crown size={11} color={palette.butter[600]} />
      <AppText variant="caption" style={styles.markText}>
        Premium
      </AppText>
    </View>
  );
}

/** The locked state for one feature: what it is, and how to unlock it. */
export function PremiumLocked({ feature, compact }: { feature: PremiumFeature; compact?: boolean }) {
  const f = PREMIUM_FEATURES[feature];
  return (
    <Card tone="butter" style={[styles.card, compact && { padding: 14 }]}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Lock size={18} color={brandText} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.titleRow}>
            <AppText variant="bodyBold" style={{ flexShrink: 1 }}>
              {f.label}
            </AppText>
            <PremiumMark />
          </View>
          <AppText variant="small" muted>
            {f.description}
          </AppText>
        </View>
      </View>
      <Button label="Start 7-day free trial" icon={Sparkles} size={compact ? 'sm' : 'md'} full={!compact} onPress={() => router.push('/premium')} style={{ marginTop: 12, alignSelf: compact ? 'flex-start' : undefined }} />
      {!compact ? (
        <AppText variant="caption" muted center style={{ marginTop: 8 }}>
          Premium is free to try. No payment is taken in this build.
        </AppText>
      ) : null}
    </Card>
  );
}

/** Shows `children` on Premium; otherwise the locked card (and an optional preview above it). */
export function PremiumGate({ feature, children, preview, compact }: { feature: PremiumFeature; children: ReactNode; preview?: ReactNode; compact?: boolean }) {
  const premium = usePremium();
  if (premium) return <>{children}</>;
  return (
    <>
      {preview}
      <PremiumLocked feature={feature} compact={compact} />
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: 0 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  mark: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: palette.butter[100] },
  markText: { fontSize: 11, color: palette.ink[800] },
});
