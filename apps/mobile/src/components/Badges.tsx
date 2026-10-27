import { DEMO, COPY } from '@healthx/shared';
import { ChevronDown, CloudOff, Info, Sparkles } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from './Text';
import { brandText, colors, font, palette } from '@/lib/theme';

type Tone = 'green' | 'rose' | 'lavender' | 'peach' | 'sky' | 'indigo' | 'butter' | 'ink' | 'danger';
const TONES: Record<Tone, { bg: string; fg: string; border: string }> = {
  green: { bg: palette.green[100], fg: brandText, border: palette.green[200] },
  rose: { bg: palette.rose[100], fg: palette.rose[700], border: palette.rose[200] },
  lavender: { bg: palette.lavender[100], fg: palette.lavender[700], border: palette.lavender[200] },
  peach: { bg: palette.peach[100], fg: palette.peach[700], border: palette.peach[200] },
  sky: { bg: palette.sky[100], fg: palette.sky[700], border: palette.sky[200] },
  indigo: { bg: palette.indigo[100], fg: palette.indigo[700], border: palette.indigo[200] },
  butter: { bg: palette.butter[100], fg: palette.ink[800], border: palette.butter[200] },
  ink: { bg: palette.ink[100], fg: palette.ink[700], border: palette.ink[200] },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: palette.rose[200] },
};

export function Pill({ label, tone = 'green', style, icon }: { label: string; tone?: Tone; style?: ViewStyle; icon?: ReactNode }) {
  const t = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      {icon}
      <AppText variant="caption" color={t.fg} style={{ fontSize: 11.5, fontFamily: font.semibold }}>
        {label}
      </AppText>
    </View>
  );
}

/** Marks features from later SRS phases (2 = Phase 2, 3/4 = previews). */
export function PhaseBadge({ phase, style }: { phase: 2 | 3 | 4; style?: ViewStyle }) {
  const label = phase === 2 ? DEMO.phase2 : phase === 3 ? DEMO.phase3 : 'Phase 4 preview';
  const tone: Tone = phase === 2 ? 'butter' : phase === 3 ? 'lavender' : 'sky';
  return <Pill label={label} tone={tone} icon={<Sparkles size={11} color={phase === 2 ? palette.butter[600] : TONES[tone].fg} />} style={style} />;
}

/** Marks UI that needs a real backend in production. */
export function BackendNote({ text = DEMO.needsBackend, style }: { text?: string; style?: ViewStyle }) {
  return (
    <View style={[styles.backend, style]}>
      <View style={styles.backendIcon}>
        <CloudOff size={13} color={palette.ink[600]} />
      </View>
      <AppText variant="caption" muted style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

/** "Estimate*" marker with an expandable explanation (SRS §11, §12, §67). */
export function EstimateNote({ text = COPY.estimate, style, compact }: { text?: string; style?: ViewStyle; compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="About estimates"
      aria-expanded={open}
      onPress={() => setOpen((o) => !o)}
      style={({ pressed }) => [styles.estimate, pressed && { opacity: 0.85 }, style]}>
      <View style={styles.estimateIcon}>
        <Info size={13} color={palette.lavender[600]} />
      </View>
      <AppText variant="caption" color={palette.lavender[700]} style={{ flex: 1, fontSize: 12.5, lineHeight: 17 }}>
        {open ? `* ${text}` : '* Estimate — tap to learn more'}
      </AppText>
      {compact ? <ChevronDown size={14} color={palette.lavender[600]} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} /> : null}
    </Pressable>
  );
}

export function Disclaimer({ text, tone = 'ink', style, title }: { text: string; tone?: 'ink' | 'rose' | 'lavender' | 'danger'; style?: ViewStyle; title?: string }) {
  const map = {
    ink: { bg: palette.ink[50], fg: palette.ink[700], border: palette.ink[200], icon: palette.ink[600] },
    rose: { bg: palette.rose[50], fg: palette.rose[700], border: palette.rose[100], icon: palette.rose[600] },
    lavender: { bg: palette.lavender[50], fg: palette.lavender[700], border: palette.lavender[100], icon: palette.lavender[600] },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: palette.rose[200], icon: colors.danger },
  }[tone];
  return (
    <View style={[styles.disclaimer, { backgroundColor: map.bg, borderColor: map.border }, style]} accessibilityRole={tone === 'danger' ? 'alert' : undefined}>
      <View style={styles.disclaimerIcon}>
        <Info size={15} color={map.icon} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <AppText variant="smallMedium" color={map.fg}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="small" color={map.fg}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

export function UnreadDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.dot}>
      <AppText variant="caption" color="#fff" style={{ fontSize: 10, lineHeight: 12 }}>
        {count > 9 ? '9+' : count}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  backend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: palette.ink[50],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.ink[300],
  },
  backendIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  estimate: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 16, backgroundColor: palette.lavender[50], borderWidth: 1, borderStyle: 'dashed', borderColor: palette.lavender[200] },
  estimateIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 20, borderWidth: 1 },
  disclaimerIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  dot: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: palette.rose[500],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
