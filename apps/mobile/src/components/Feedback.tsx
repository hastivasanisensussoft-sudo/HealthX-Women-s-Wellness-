/** Illustrated empty / error states and shimmering skeletons (Evergreen kit). */
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import { CloudOff, Sprout } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';

import { Leaf, Sparkle } from './Art';
import { Button } from './Button';
import { AppText } from './Text';
import { colors, layout, palette, shadow } from '@/lib/theme';

export type StateTone = 'green' | 'rose' | 'lavender' | 'peach' | 'sky' | 'indigo';

const STATE_TONES: Record<StateTone, { wash: string; leaf: string; icon: string; leafAlt: string }> = {
  green: { wash: palette.green[50], leaf: palette.green[200], icon: palette.green[700], leafAlt: palette.rose[200] },
  rose: { wash: palette.rose[50], leaf: palette.rose[200], icon: palette.rose[600], leafAlt: palette.green[200] },
  lavender: { wash: palette.lavender[50], leaf: palette.lavender[200], icon: palette.lavender[600], leafAlt: palette.green[200] },
  peach: { wash: palette.peach[50], leaf: palette.peach[200], icon: palette.peach[600], leafAlt: palette.green[200] },
  sky: { wash: palette.sky[50], leaf: palette.sky[200], icon: palette.sky[600], leafAlt: palette.rose[200] },
  indigo: { wash: palette.indigo[50], leaf: palette.indigo[200], icon: palette.indigo[600], leafAlt: palette.rose[200] },
};

/** Small illustration: tinted wash, two leaves, a white icon disc and a sparkle. */
export function StateArt({ icon: Icon = Sprout, tone = 'green', size = 112 }: { icon?: LucideIcon; tone?: StateTone; size?: number }) {
  const t = STATE_TONES[tone];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: t.wash }} />
      <Leaf size={size * 0.42} color={t.leaf} rotate={-20} style={{ left: -2, top: size * 0.08 }} />
      <Leaf size={size * 0.34} color={t.leafAlt} rotate={70} style={{ right: 0, bottom: size * 0.06 }} />
      <Sparkle size={size * 0.16} color={palette.butter[400]} style={{ right: size * 0.12, top: size * 0.1 }} />
      <Sparkle size={size * 0.1} color={t.leaf} style={{ left: size * 0.16, bottom: size * 0.14 }} />
      <View style={[styles.artDisc, { width: size * 0.52, height: size * 0.52, borderRadius: size * 0.26 }]}>
        <Icon size={size * 0.22} color={t.icon} />
      </View>
    </View>
  );
}

export function EmptyState({
  icon = Sprout,
  title,
  text,
  action,
  onAction,
  style,
  tone = 'green',
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  text?: string;
  action?: string;
  onAction?: () => void;
  style?: ViewStyle;
  /** Illustration tint (additive). */
  tone?: StateTone;
  /** Smaller illustration for use inside cards (additive). */
  compact?: boolean;
}) {
  return (
    <View style={[styles.empty, compact && { paddingVertical: 16 }, style]}>
      <StateArt icon={icon} tone={tone} size={compact ? 84 : 112} />
      <AppText variant="h2" center style={{ marginTop: 6, fontSize: compact ? 17 : 19 }}>
        {title}
      </AppText>
      {text ? (
        <AppText variant="small" muted center style={{ maxWidth: 290 }}>
          {text}
        </AppText>
      ) : null}
      {action ? <Button label={action} size="sm" onPress={onAction} style={{ marginTop: 8 }} /> : null}
    </View>
  );
}

export function ErrorState({ text = "We couldn't load this right now.", onRetry }: { text?: string; onRetry?: () => void }) {
  return <EmptyState icon={CloudOff} tone="peach" title="Something went wrong" text={text} action={onRetry ? 'Try again' : undefined} onAction={onRetry} />;
}

/** "#RRGGBB" + alpha → rgba(), so the shimmer follows the theme's surface colour. */
const alpha = (hex: string, a: number) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return a === 0 ? 'transparent' : hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Looping shimmer sweep (skipped when the OS asks for reduced motion). */
function useShimmer() {
  const [x] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled || reduce) return;
        loop = Animated.loop(Animated.timing(x, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
        loop.start();
      });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [x]);
  return x;
}

export function Skeleton({ height = 16, width = '100%', radius = 10, style }: { height?: number; width?: number | `${number}%`; radius?: number; style?: ViewStyle }) {
  const x = useShimmer();
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const band = Math.max(80, w * 0.6);
  return (
    <View onLayout={onLayout} style={[{ height, width, borderRadius: radius, backgroundColor: palette.ink[100], overflow: 'hidden' }, style]}>
      {w ? (
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: band, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-band, w] }) }] }}>
          <LinearGradient colors={[alpha(colors.surface, 0), alpha(colors.surface, 0.75), alpha(colors.surface, 0)]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : null}
    </View>
  );
}

export function SkeletonCard({ lines = 3, height }: { lines?: number; height?: number }) {
  return (
    <View style={styles.skCard} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {height ? (
        <Skeleton height={height} radius={18} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Skeleton height={40} width={40} radius={20} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton height={14} width="55%" />
              <Skeleton height={10} width="35%" />
            </View>
          </View>
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} height={12} width={i === lines - 1 ? '70%' : '100%'} />
          ))}
        </>
      )}
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: 6, paddingVertical: 24, paddingHorizontal: 16 },
  artDisc: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  skCard: { backgroundColor: colors.surface, borderRadius: layout.cardRadius, padding: 18, gap: 12, borderWidth: 1, borderColor: palette.ink[100] },
});
