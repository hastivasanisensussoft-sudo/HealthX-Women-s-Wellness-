/** Wellness score breakdown (SRS §31) — an engagement metric, not a medical score. */
import { COPY, wellnessScore, wellnessScoreSeries } from '@healthx/shared';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Leaf } from './Art';
import { PhaseBadge } from './Badges';
import { Card, SectionHeader } from './Card';
import { LineChart, ProgressBar, ProgressRing } from './Charts';
import { AppText } from './Text';
import { useStore } from '@/lib/store';
import { brandText, colors, font, palette } from '@/lib/theme';

const COLORS: Record<string, string> = {
  activity: palette.green[500],
  sleep: palette.indigo[400],
  hydration: palette.sky[400],
  nutrition: palette.butter[500],
  habits: palette.peach[400],
  mood: palette.lavender[400],
};

export function ScoreBreakdown() {
  const { state } = useStore();
  const s = useMemo(() => wellnessScore(state), [state]);
  const series = useMemo(() => wellnessScoreSeries(state, 14), [state]);
  return (
    <View>
      <Card tone="mint" style={styles.hero}>
        <Leaf size={120} color={palette.green[100]} rotate={30} style={{ right: -30, top: -30 }} />
        <ProgressRing value={(s.score ?? 0) / 100} size={164} stroke={15} color={palette.green[700]} track={colors.surface}>
          <AppText style={styles.big}>{s.score ?? '—'}</AppText>
          <AppText variant="overline" color={palette.green[700]}>
            / 100 today
          </AppText>
        </ProgressRing>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <AppText variant="h2">Wellness score</AppText>
          <PhaseBadge phase={2} />
        </View>
        <AppText variant="small" color={brandText} center style={{ marginTop: 4, maxWidth: 300 }}>
          {COPY.wellnessScore}
        </AppText>
      </Card>
      <SectionHeader eyebrow="Breakdown" title="What makes up today's score" />
      <Card style={{ gap: 14 }}>
        {s.components.map((c) => (
          <View key={c.key}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                <View style={[styles.swatch, { backgroundColor: COLORS[c.key] }]} />
                <AppText variant="bodyMedium">
                  {c.label} <AppText variant="caption" muted>· weight {c.weight}%</AppText>
                </AppText>
              </View>
              <AppText variant="smallMedium" color={c.value === null ? palette.ink[400] : palette.ink[800]}>
                {c.value === null ? 'No data' : `${c.value}/100`}
              </AppText>
            </View>
            <ProgressBar value={(c.value ?? 0) / 100} color={COLORS[c.key]} track={palette.ink[100]} height={9} style={{ marginTop: 7 }} />
          </View>
        ))}
        {s.missing.length ? (
          <AppText variant="caption" muted>
            Missing components are left out and the remaining weights re-balanced (decision D-06). Weights are set by the HealthX team.
          </AppText>
        ) : null}
      </Card>
      <SectionHeader eyebrow="Trend" title="Last 14 days" />
      <Card>
        <LineChart data={series.map((d) => ({ label: d.label, value: d.score }))} min={0} max={100} color={palette.green[500]} yTicks={[25, 50, 75]} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', overflow: 'hidden', paddingVertical: 22 },
  big: { fontFamily: font.displayBold, fontSize: 44, lineHeight: 50, letterSpacing: -1, color: palette.ink[900] },
  swatch: { width: 10, height: 10, borderRadius: 5 },
});
