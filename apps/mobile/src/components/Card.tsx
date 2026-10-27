import { ChevronRight } from 'lucide-react-native';
import { useEffect, type ReactNode, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './Text';
import { colors, layout, palette, shadow } from '@/lib/theme';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'white' | 'mint' | 'rose' | 'lavender' | 'peach' | 'sky' | 'indigo' | 'butter' | 'deep';
  padded?: boolean;
  /** Fade/slide in on mount (subtle). */
  animated?: boolean;
  delay?: number;
  accessibilityLabel?: string;
}

export const TONE_BG: Record<NonNullable<CardProps['tone']>, string> = {
  white: colors.surface,
  mint: palette.green[50],
  rose: palette.rose[50],
  lavender: palette.lavender[50],
  peach: palette.peach[50],
  sky: palette.sky[50],
  indigo: palette.indigo[50],
  butter: palette.butter[50],
  deep: palette.green[900],
};

export function Card({ children, style, onPress, tone = 'white', padded = true, animated, delay = 0, accessibilityLabel }: CardProps) {
  const [anim] = useState(() => new Animated.Value(animated ? 0 : 1));
  useEffect(() => {
    if (!animated) return;
    Animated.timing(anim, { toValue: 1, duration: 420, delay, useNativeDriver: true }).start();
  }, [anim, animated, delay]);

  // When pressable, layout props (flex/width/margins) belong on the Pressable wrapper.
  const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  const { flex, flexGrow, flexShrink, flexBasis, width, alignSelf, margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical, ...inner } = flat;
  const outer: ViewStyle = { flex, flexGrow, flexShrink, flexBasis, width, alignSelf, margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical };

  const body = (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: TONE_BG[tone] },
        tone === 'white' ? [shadow.card, styles.outline] : styles.flat,
        padded && styles.padded,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
        onPress ? [inner, { flexGrow: 1 }] : style,
      ]}>
      {children}
    </Animated.View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [outer, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
      {body}
    </Pressable>
  );
}

export function SectionHeader({ title, action, onAction, style, eyebrow }: { title: string; action?: string; onAction?: () => void; style?: ViewStyle; eyebrow?: string }) {
  return (
    <View style={[styles.section, style]}>
      <View style={{ flexShrink: 1 }}>
        {eyebrow ? (
          <AppText variant="overline" color={palette.green[700]} style={{ marginBottom: 2 }}>
            {eyebrow}
          </AppText>
        ) : null}
        <AppText variant="h2">{title}</AppText>
      </View>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8} style={styles.sectionAction}>
          <AppText variant="smallMedium" color={palette.green[700]}>
            {action}
          </AppText>
          <ChevronRight size={14} color={palette.green[700]} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function ListRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
  last,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && onPress && { backgroundColor: palette.green[50] }]}>
      {icon ? <View style={styles.rowIcon}>{icon}</View> : null}
      <View style={{ flex: 1 }}>
        <AppText variant="bodyMedium">{title}</AppText>
        {subtitle ? (
          <AppText variant="small" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ?? (onPress ? <ChevronRight size={18} color={colors.textSubtle} /> : null)}
    </Pressable>
  );
}

export function IconBubble({ children, bg = palette.green[100], size = 40 }: { children: ReactNode; bg?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: layout.cardRadius },
  flat: { borderWidth: 1, borderColor: 'rgba(13,67,54,0.05)' },
  outline: { borderWidth: 1, borderColor: palette.ink[100] },
  padded: { padding: 18 },
  section: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 28, marginBottom: 12, gap: 12 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 4 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rowIcon: { width: 40, alignItems: 'center' },
});
