import { COPY, type Insight } from '@healthx/shared';
import { ArrowRight, Lightbulb, Sparkles, TrendingUp, TriangleAlert, X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { PhaseBadge } from './Badges';
import { AppText } from './Text';
import { openLink } from '@/lib/links';
import { colors, font, palette } from '@/lib/theme';

const TONE = {
  positive: { bg: palette.green[50], border: palette.green[100], fg: palette.green[700], icon: Sparkles, tag: 'Nice work' },
  suggestion: { bg: palette.butter[50], border: palette.butter[100], fg: palette.ink[800], icon: Lightbulb, tag: 'Suggestion' },
  pattern: { bg: palette.lavender[50], border: palette.lavender[100], fg: palette.lavender[700], icon: TrendingUp, tag: 'Observed pattern' },
  attention: { bg: palette.rose[50], border: palette.rose[100], fg: palette.rose[700], icon: TriangleAlert, tag: 'Worth a look' },
} as const;

export function InsightCard({ insight, onDismiss }: { insight: Insight; onDismiss?: () => void }) {
  const t = TONE[insight.tone];
  const Icon = t.icon;
  return (
    <View style={[styles.card, { backgroundColor: t.bg, borderColor: t.border }]}>
      <View style={styles.top}>
        <View style={styles.icon}>
          <Icon size={18} color={t.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <AppText variant="overline" color={t.fg}>
              {t.tag}
            </AppText>
            {insight.phase === 2 ? <PhaseBadge phase={2} /> : null}
          </View>
          <AppText style={styles.title}>{insight.title}</AppText>
          <AppText variant="small" color={palette.ink[700]} style={{ marginTop: 4 }}>
            {insight.body}
          </AppText>
          {insight.tone === 'pattern' ? (
            <AppText variant="caption" color={t.fg} style={{ marginTop: 6 }}>
              {COPY.observedPattern}
            </AppText>
          ) : null}
          {insight.ctaLabel && insight.ctaTo ? (
            <Pressable accessibilityRole="link" onPress={() => openLink(insight.ctaTo!)} style={styles.cta} hitSlop={6}>
              <AppText variant="smallMedium" color={t.fg}>
                {insight.ctaLabel}
              </AppText>
              <ArrowRight size={14} color={t.fg} />
            </Pressable>
          ) : null}
        </View>
        {onDismiss ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss insight" onPress={onDismiss} hitSlop={10} style={styles.dismiss}>
            <X size={14} color={palette.ink[500]} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: 16, borderWidth: 1 },
  top: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.display, fontSize: 16.5, lineHeight: 22, marginTop: 2, color: palette.ink[900] },
  cta: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  dismiss: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
