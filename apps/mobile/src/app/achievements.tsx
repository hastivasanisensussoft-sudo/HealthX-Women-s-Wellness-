/** Streaks & badges (SRS §35 gamification, Phase 2; mockup M43): streak hero and a badge gallery. Never gamifies cycle or reproductive events. */
import { checkInStreak, formatDate, waterStreak } from '@healthx/shared';
import { Award, Droplets, Flame, Lock } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { PhaseBadge } from '@/components/Badges';
import { ProgressRing } from '@/components/Charts';
import { EmptyState } from '@/components/Feedback';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { GlassStat, GroupHeader, HeroPanel, PageIntro, ON_DARK } from '@/components/b-kit';
import { KeyIcon } from '@/lib/icons';
import { useStore } from '@/lib/store';
import { colors, font, palette, shadow } from '@/lib/theme';

export default function Achievements() {
  const { state } = useStore();
  const streak = checkInStreak(state);
  const water = waterStreak(state);
  const earned = state.badges.filter((b) => b.earnedAt);
  const locked = state.badges.filter((b) => !b.earnedAt).sort((a, b) => b.progress - a.progress);

  return (
    <Screen back right={<PhaseBadge phase={2} />}>
      <PageIntro eyebrow="Streaks & badges" title="Achievements" subtitle="Celebrating the everyday habits that add up." />

      <HeroPanel>
        <View style={styles.heroRow}>
          <View style={styles.flame}>
            <Flame size={34} color={palette.peach[400]} fill={palette.peach[400]} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.big}>{streak}-day</AppText>
            <AppText variant="h3" color="#fff">
              wellness streak
            </AppText>
            <AppText variant="small" color={ON_DARK.soft} style={{ marginTop: 2 }}>
              {streak > 0 ? 'Check in tomorrow to keep it going' : 'Complete today’s check-in to start a streak'}
            </AppText>
          </View>
        </View>
        <View style={styles.glassRow}>
          <GlassStat label="Hydration streak" value={`${water} d`} icon={<Droplets size={15} color={palette.sky[400]} />} />
          <GlassStat label="Badges earned" value={`${earned.length}/${state.badges.length}`} icon={<Award size={15} color={palette.butter[400]} />} />
        </View>
      </HeroPanel>

      <GroupHeader eyebrow={`${earned.length} earned`} title="Your badges" />
      {earned.length ? (
        <View style={styles.grid}>
          {earned.map((b) => (
            <View key={b.id} style={[styles.badge, styles.badgeEarned]} accessible accessibilityLabel={`${b.title}: earned ${formatDate(b.earnedAt as string, 'short')}`}>
              <View style={styles.medal}>
                <KeyIcon name={b.icon} size={26} color={palette.green[950]} />
              </View>
              <AppText variant="smallMedium" center numberOfLines={2} style={{ marginTop: 8 }}>
                {b.title}
              </AppText>
              <AppText variant="caption" color={palette.green[700]} center style={{ fontSize: 11 }}>
                {formatDate(b.earnedAt as string, 'short')}
              </AppText>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState icon={Award} title="No badges yet" text="Check in, drink water and move — your first badge is close." />
      )}

      {locked.length ? (
        <>
          <GroupHeader eyebrow="Keep going" title="In progress" />
          <View style={styles.grid}>
            {locked.map((b) => (
              <View key={b.id} style={styles.badge} accessible accessibilityLabel={`${b.title}: ${Math.round(b.progress * 100)}% complete`}>
                <ProgressRing value={b.progress} size={70} stroke={5} color={palette.green[500]} track={palette.ink[100]}>
                  <View style={styles.lockedMedal}>
                    <KeyIcon name={b.icon} size={22} color={palette.green[400]} />
                    <View style={styles.lock}>
                      <Lock size={9} color={palette.ink[500]} />
                    </View>
                  </View>
                </ProgressRing>
                <AppText variant="smallMedium" center numberOfLines={2} style={{ marginTop: 6 }}>
                  {b.title}
                </AppText>
                <AppText variant="caption" muted center style={{ fontSize: 11 }}>
                  {Math.round(b.progress * 100)}% · {b.description}
                </AppText>
              </View>
            ))}
          </View>
        </>
      ) : null}
      <AppText variant="caption" muted style={{ marginTop: 18, fontStyle: 'italic' }}>
        We never turn cycle or reproductive events into badges. Badges celebrate everyday habits only.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  flame: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  big: { fontFamily: font.displayBold, fontSize: 34, lineHeight: 38, color: '#fff', letterSpacing: -0.6 },
  glassRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { width: '31%', flexGrow: 1, maxWidth: '33%', alignItems: 'center', padding: 12, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  badgeEarned: { backgroundColor: palette.butter[50], borderColor: palette.butter[100] },
  medal: { width: 64, height: 64, borderRadius: 32, backgroundColor: palette.butter[400], borderWidth: 4, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  lockedMedal: { width: 52, height: 52, borderRadius: 26, backgroundColor: palette.green[50], alignItems: 'center', justifyContent: 'center' },
  lock: { position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[200], alignItems: 'center', justifyContent: 'center' },
});
