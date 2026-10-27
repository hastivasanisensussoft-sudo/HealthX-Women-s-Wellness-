import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from './Text';
import { brandText, colors, font, palette } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'rose' | 'danger' | 'light' | 'dark';
type Size = 'sm' | 'md' | 'lg';

const V: Record<Variant, { bg: string; fg: string; border?: string }> = {
  // Solid brand primary, surface + brand outline secondary, deep brand "dark".
  primary: { bg: colors.primary, fg: '#FFFFFF' },
  secondary: { bg: colors.surface, fg: palette.green[700], border: palette.green[700] },
  soft: { bg: palette.green[50], fg: brandText, border: palette.green[200] },
  ghost: { bg: 'transparent', fg: palette.green[700] },
  dark: { bg: palette.green[900], fg: '#FFFFFF' },
  rose: { bg: palette.rose[500], fg: '#FFFFFF' },
  danger: { bg: colors.danger, fg: '#FFFFFF' },
  light: { bg: 'rgba(255,255,255,0.92)', fg: palette.green[900] },
};
const S: Record<Size, { h: number; px: number; fs: number }> = {
  sm: { h: 38, px: 14, fs: 13 },
  md: { h: 46, px: 18, fs: 15 },
  lg: { h: 52, px: 22, fs: 16 },
};

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

export function Button({ label, onPress, variant = 'primary', size = 'md', icon: Icon, iconRight: IconR, loading, disabled, full, style, accessibilityHint }: ButtonProps) {
  const v = V[variant];
  const s = S[size];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      aria-disabled={!!off} aria-busy={!!loading}
      disabled={!!off}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        { height: s.h, paddingHorizontal: s.px, backgroundColor: v.bg, borderColor: v.border ?? 'transparent', borderRadius: s.h / 2 },
        (variant === 'primary' || variant === 'dark') && !off && styles.lift,
        full && styles.full,
        pressed && !off && styles.pressed,
        off && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {Icon ? <Icon size={s.fs + 3} color={v.fg} /> : null}
          <AppText style={{ color: v.fg, fontFamily: font.semibold, fontSize: s.fs, letterSpacing: -0.1 }}>{label}</AppText>
          {IconR ? <IconR size={s.fs + 3} color={v.fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  onPress,
  label,
  tone = 'surface',
  size = 40,
  badge,
}: {
  icon: LucideIcon;
  onPress?: () => void;
  label: string;
  tone?: 'surface' | 'soft' | 'primary' | 'clear';
  size?: number;
  badge?: ReactNode;
}) {
  const bg = tone === 'primary' ? colors.primary : tone === 'soft' ? palette.green[50] : tone === 'clear' ? 'transparent' : colors.surface;
  const fg = tone === 'primary' ? '#fff' : brandText;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.icon,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        tone === 'surface' && styles.iconBorder,
        pressed && styles.pressed,
      ]}>
      <Icon size={Math.round(size * 0.48)} color={fg} />
      {badge ? <View style={styles.badge}>{badge}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
  },
  full: { alignSelf: 'stretch' },
  lift: { shadowColor: '#0D4336', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  icon: { alignItems: 'center', justifyContent: 'center' },
  iconBorder: { borderWidth: 1, borderColor: colors.borderSoft },
  badge: { position: 'absolute', top: -2, right: -2 },
});
