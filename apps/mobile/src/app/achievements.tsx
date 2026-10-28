/** Streaks & badges (SRS §35 gamification, Phase 2; mockup M43): streak hero and a badge gallery. Never gamifies cycle or reproductive events. */
import { checkInStreak, formatDate, waterStreak } from '@healthx/shared';
import { Award, ChevronRight, Lock } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { PhaseBadge } from '@/components/Badges';
import { ProgressRing } from '@/components/Charts';
import { EmptyState } from '@/components/Feedback';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { GroupHeader, PageIntro } from '@/components/b-kit';
import { KeyIcon } from '@/lib/icons';
import { useStore } from '@/lib/store';
import { colors, font, palette, shadow } from '@/lib/theme';

const ART = {
  leaves: require('../../assets/images/achievements/leaves.png'),
  flame: require('../../assets/images/achievements/flame.png'),
  trophy: require('../../assets/images/achievements/trophy.png'),
  drop: require('../../assets/images/achievements/drop.png'),
  medal: require('../../assets/images/achievements/medal.png'),
};

export default function Achievements() {
  const { state } = useStore();
  const streak = checkInStreak(state);
  const water = waterStreak(state);
  const earned = state.badges.filter((b) => b.earnedAt);
  const locked = state.badges.filter((b) => !b.earnedAt).sort((a, b) => b.progress - a.progress);
  const { width: winW } = useWindowDimensions();
  const leafW = Math.round(Math.min(260, Math.max(150, winW * 0.42)));
  const trophyW = Math.round(Math.min(190, Math.max(116, winW * 0.32)));
  // "Badges earned" scrolls to the badge list below
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [badgesY, setBadgesY] = useState(0);

  return (
    <Screen back right={<PhaseBadge phase={2} />} scrollRef={scrollRef}>
      {/* header with foliage peeking over the streak card */}
      <View>
        <Image source={ART.leaves} style={[styles.headerArt, { width: leafW, height: leafW * 0.45 }]} contentFit="contain" accessible={false} />
        <PageIntro eyebrow="Streaks & badges" title="Achievements" subtitle="Celebrating the everyday habits that add up." style={{ paddingRight: leafW * 0.42 }} />
      </View>

      <View style={styles.hero} accessible accessibilityLabel={`${streak}-day wellness streak`}>
        <LinearGradient colors={[palette.green[800], palette.green[900], palette.green[950]]} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.heroHills} pointerEvents="none">
          <Svg width="100%" height="100%" viewBox="0 0 360 60" preserveAspectRatio="none">
            <Path d="M0 40 C60 20 120 46 180 34 C240 22 300 30 360 18 L360 60 L0 60 Z" fill="#FFFFFF" opacity={0.05} />
          </Svg>
        </View>
        <Image source={ART.trophy} style={[styles.trophy, { width: trophyW, height: trophyW * 0.92 }]} contentFit="contain" accessible={false} />
        <View style={[styles.heroRow, { paddingRight: trophyW * 0.62 }]}>
          <Image source={ART.flame} style={{ width: 92, height: 96, marginLeft: -8 }} contentFit="contain" accessible={false} />
          <View style={{ flex: 1 }}>
            <AppText style={styles.big}>{streak}-day</AppText>
            <AppText style={styles.heroTitle}>wellness streak</AppText>
            <AppText style={styles.heroSub}>{streak > 0 ? 'Check in tomorrow to keep it going' : 'Complete today’s check-in to start a streak'}</AppText>
          </View>
        </View>
      </View>

      <View style={styles.statRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Hydration streak ${water} days. Open hydration`} onPress={() => router.push('/hydration')} style={({ pressed }) => [styles.stat, styles.statSky, pressed && styles.statPressed]}>
          <LinearGradient colors={['#F4F9FF', '#E6F1FD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.statWave} pointerEvents="none">
            <Svg width="100%" height="100%" viewBox="0 0 200 50" preserveAspectRatio="none">
              <Path d="M0 22 C40 8 70 30 110 18 C150 6 175 14 200 10 L200 50 L0 50 Z" fill="#B9DAF8" opacity={0.7} />
              <Path d="M0 32 C50 22 90 40 140 28 C170 20 188 24 200 22 L200 50 L0 50 Z" fill="#8EC3F2" opacity={0.6} />
            </Svg>
          </View>
          <Image source={ART.drop} style={styles.statArt} contentFit="contain" accessible={false} />
          <View style={{ flex: 1 }}>
            <AppText style={styles.statLabel}>{'HYDRATION\nSTREAK'}</AppText>
            <AppText style={styles.statValue}>{water} d</AppText>
          </View>
          <View style={styles.statGo}>
            <ChevronRight size={13} color={palette.sky[600]} />
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Badges earned ${earned.length} of ${state.badges.length}. Show your badges`} onPress={() => scrollRef.current?.scrollTo({ y: Math.max(0, badgesY - 8), animated: true })} style={({ pressed }) => [styles.stat, styles.statButter, pressed && styles.statPressed]}>
          <LinearGradient colors={['#FFFBF0', '#FDF0D2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.statWave} pointerEvents="none">
            <Svg width="100%" height="100%" viewBox="0 0 200 50" preserveAspectRatio="none">
              <Path d="M0 26 C40 14 80 34 120 22 C155 12 180 18 200 14 L200 50 L0 50 Z" fill="#F7E2A8" opacity={0.55} />
            </Svg>
          </View>
          <Image source={ART.medal} style={styles.statArt} contentFit="contain" accessible={false} />
          <View style={{ flex: 1 }}>
            <AppText style={styles.statLabel}>{'BADGES\nEARNED'}</AppText>
            <AppText style={styles.statValue}>
              {earned.length}/{state.badges.length}
            </AppText>
          </View>
          <View style={styles.statGo}>
            <ChevronRight size={13} color={palette.butter[600]} />
          </View>
        </Pressable>
      </View>

      <View onLayout={(e) => setBadgesY(e.nativeEvent.layout.y)}>
        <GroupHeader eyebrow={`${earned.length} earned`} title="Your badges" />
      </View>
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
  headerArt: { position: 'absolute', right: -16, bottom: -30 },
  hero: { borderRadius: 28, padding: 16, paddingVertical: 20, overflow: 'hidden', shadowColor: '#0D4336', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  heroHills: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 60 },
  trophy: { position: 'absolute', right: -6, bottom: -6 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  big: { fontFamily: font.displayBold, fontSize: 34, lineHeight: 38, color: '#fff', letterSpacing: -0.6 },
  heroTitle: { fontFamily: font.displayBold, fontSize: 18, lineHeight: 23, color: '#FFFFFF' },
  heroSub: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.78)', marginTop: 4 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, paddingTop: 14, minHeight: 96, borderRadius: 22, borderWidth: 1.5, overflow: 'hidden' },
  statSky: { borderColor: '#DCEBFB' },
  statButter: { borderColor: '#F8EBC8' },
  statPressed: { transform: [{ scale: 0.98 }] },
  statWave: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '42%' },
  statArt: { width: 40, height: 38, marginLeft: -2 },
  statLabel: { fontFamily: font.monoMedium, fontSize: 9.5, lineHeight: 13, letterSpacing: 0.6, color: '#3E5249' },
  statValue: { fontFamily: font.displayBold, fontSize: 24, lineHeight: 29, color: '#13261E', marginTop: 2 },
  statGo: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { width: '31%', flexGrow: 1, maxWidth: '33%', alignItems: 'center', padding: 12, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100], ...shadow.card },
  badgeEarned: { backgroundColor: palette.butter[50], borderColor: palette.butter[100] },
  medal: { width: 64, height: 64, borderRadius: 32, backgroundColor: palette.butter[400], borderWidth: 4, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  lockedMedal: { width: 52, height: 52, borderRadius: 26, backgroundColor: palette.green[50], alignItems: 'center', justifyContent: 'center' },
  lock: { position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[200], alignItems: 'center', justifyContent: 'center' },
});
