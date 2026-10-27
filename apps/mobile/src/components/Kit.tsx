/** Small building blocks that recur across the HealthX app (steps, stat tiles, checklists). */
import { Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from './Text';
import { TILE_TONES, type TileTone } from './Tiles';
import { brandText, colors, font, palette } from '@/lib/theme';

/** Hours as "7 h 30 m" (mockup steppers). */
export const fmtSleep = (h: number) => `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')} m`;

/** Onboarding header: back disc · "Step n of total" · Skip, with a segmented progress track (mockup M06–M09). */
export function StepHeader({ step, total, onBack, onSkip }: { step: number; total: number; onBack?: () => void; onSkip?: () => void }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={styles.stepRow}>
        <View style={{ width: 64 }}>
          {onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Previous step" onPress={onBack} hitSlop={10} style={({ pressed }) => [styles.stepBack, pressed && { backgroundColor: palette.green[50] }]}>
              <ChevronLeft size={22} color={brandText} />
            </Pressable>
          ) : null}
        </View>
        <AppText variant="overline" color={palette.green[700]} accessibilityLiveRegion="polite">
          Step {step} of {total}
        </AppText>
        <View style={{ width: 64, alignItems: 'flex-end' }}>
          {onSkip ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Skip this step" onPress={onSkip} hitSlop={10} style={styles.skip}>
              <AppText variant="smallMedium" color={brandText}>
                Skip
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={styles.segments} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: step }}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.segmentBar, i < step && styles.segmentOn, i === step - 1 && styles.segmentCurrent]} />
        ))}
      </View>
    </View>
  );
}

/** Tinted stat tile: icon, small label, bold Outfit value. */
export function StatTile({ label, value, icon, style, onPress, tone = 'green' }: { label: string; value: string; icon?: ReactNode; style?: ViewStyle; onPress?: () => void; tone?: TileTone }) {
  const t = TILE_TONES[tone];
  const body = (
    <>
      {icon ? <View style={styles.tileIcon}>{icon}</View> : null}
      <AppText variant="caption" color={t.hint} center style={{ marginTop: icon ? 6 : 0, opacity: 0.85 }} numberOfLines={1}>
        {label}
      </AppText>
      <AppText center numberOfLines={1} style={styles.tileValue}>
        {value}
      </AppText>
    </>
  );
  const box = [styles.tile, { backgroundColor: t.bg, borderColor: t.border }, style];
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={({ pressed }) => [box, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}>
        {body}
      </Pressable>
    );
  }
  return <View style={box}>{body}</View>;
}

/** Checklist row (mockup .check): round dot, label, optional sub line and right text. */
export function CheckRow({
  label,
  sub,
  done,
  current,
  right,
  onPress,
  last,
}: {
  label: string;
  sub?: string;
  done: boolean;
  current?: boolean;
  right?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'checkbox' : undefined}
      aria-checked={onPress ? done : undefined}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.check, !last && styles.checkBorder, current && styles.checkCurrent]}>
      <View style={[styles.dot, done && styles.dotOn, current && !done && { borderColor: palette.green[700] }]}>
        {done ? <Check size={13} color="#fff" strokeWidth={3} /> : current ? <View style={styles.dotCurrent} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant={current ? 'bodyBold' : 'body'} style={done && !current ? { color: colors.textMuted } : undefined}>
          {label}
        </AppText>
        {sub ? (
          <AppText variant="caption" color={palette.green[700]}>
            {sub}
          </AppText>
        ) : null}
      </View>
      {right ? (
        <AppText variant="small" color={palette.green[700]}>
          {right}
        </AppText>
      ) : null}
    </Pressable>
  );
}

/** Section title row (Outfit title + action "Edit ›"). */
export function TitleRow({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: ViewStyle }) {
  return (
    <View style={[styles.titleRow, style]}>
      <AppText variant="h2" style={{ fontSize: 18, flexShrink: 1 }}>
        {title}
      </AppText>
      {action ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${title}: ${action}`} onPress={onAction} hitSlop={8} style={styles.titleAction}>
          <AppText variant="smallMedium" color={palette.green[700]}>
            {action}
          </AppText>
          {onAction ? <ChevronRight size={14} color={palette.green[700]} /> : null}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  stepBack: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: palette.ink[200], backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  skip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: palette.green[50] },
  segments: { flexDirection: 'row', gap: 6, marginTop: 14 },
  segmentBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: palette.ink[100] },
  segmentOn: { backgroundColor: palette.green[300] },
  segmentCurrent: { backgroundColor: palette.green[700] },
  tile: { flex: 1, borderRadius: 20, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
  tileIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  tileValue: { fontFamily: font.display, fontSize: 17, lineHeight: 22, color: colors.text, marginTop: 1 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  checkBorder: { borderBottomWidth: 1, borderBottomColor: palette.ink[100] },
  checkCurrent: { backgroundColor: palette.green[50], borderRadius: 14, paddingHorizontal: 10 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: palette.green[300], alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: palette.green[700], borderColor: palette.green[700] },
  dotCurrent: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.green[700] },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10, gap: 10 },
  titleAction: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
});
