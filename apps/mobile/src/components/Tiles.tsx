/** Tinted quick-action tile (Myflo "Mood / Cramps / Drugs" reference): white icon disc, label, hint. */
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './Text';
import { colors, font, palette } from '@/lib/theme';

export const TILE_TONES = {
  green: { bg: palette.green[50], border: palette.green[100], icon: palette.green[700], hint: palette.green[700] },
  rose: { bg: palette.rose[50], border: palette.rose[100], icon: palette.rose[600], hint: palette.rose[700] },
  lavender: { bg: palette.lavender[50], border: palette.lavender[100], icon: palette.lavender[600], hint: palette.lavender[700] },
  peach: { bg: palette.peach[50], border: palette.peach[100], icon: palette.peach[600], hint: palette.peach[700] },
  sky: { bg: palette.sky[50], border: palette.sky[100], icon: palette.sky[600], hint: palette.sky[700] },
  indigo: { bg: palette.indigo[50], border: palette.indigo[100], icon: palette.indigo[600], hint: palette.indigo[700] },
  butter: { bg: palette.butter[50], border: palette.butter[100], icon: palette.butter[600], hint: colors.text },
} as const;
export type TileTone = keyof typeof TILE_TONES;

export function QuickTile({ icon: Icon, label, hint, tone = 'green', onPress, style }: { icon: LucideIcon; label: string; hint?: string; tone?: TileTone; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const t = TILE_TONES[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: t.bg, borderColor: t.border }, style, pressed && { transform: [{ scale: 0.97 }], opacity: 0.92 }]}>
      <View style={styles.disc}>
        <Icon size={20} color={t.icon} />
      </View>
      <AppText style={styles.label} numberOfLines={1}>
        {label}
      </AppText>
      {hint ? (
        <AppText variant="caption" color={t.hint} style={{ opacity: 0.75 }} numberOfLines={1}>
          {hint}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: 22, borderWidth: 1, padding: 14, minHeight: 116 },
  disc: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#0D4336', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  label: { fontFamily: font.display, fontSize: 16, lineHeight: 20, marginTop: 12, color: palette.ink[900] },
});
