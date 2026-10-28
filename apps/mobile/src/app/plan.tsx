/** Daily wellness plan (SRS §33) — rules-based checklist with a progress hero; AI personalisation is Phase 3 (§35). */
import { checkInOn, formatDate } from '@healthx/shared';
import { router } from 'expo-router';
import { Check, ChevronRight, ListChecks, RefreshCw } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useId } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { MoodFace } from '@/components/Art';
import { PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/Feedback';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { GroupHeader, Leaf, PageIntro } from '@/components/b-kit';
import { KeyIcon } from '@/lib/icons';
import { useStore } from '@/lib/store';
import { colors, font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const ART = {
  clipboard: require('../../assets/images/plan/clipboard.png'),
  sprout: require('../../assets/images/plan/sprout.png'),
};

/** Glassy progress ring for the plan hero: done / total in the middle with a sprout below. */
function PlanRing({ done, total, size }: { done: number; total: number; size: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = size / 2;
  const B = size * 0.1;
  const R = c - B / 2 - size * 0.05;
  const frac = total ? Math.max(0, Math.min(1, done / total)) : 0;
  const pt = (deg: number) => ({ x: c + R * Math.cos((deg * Math.PI) / 180), y: c + R * Math.sin((deg * Math.PI) / 180) });
  const s = pt(-90);
  const e = pt(-90 + frac * 359.9);
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`${done} of ${total} done`}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#CFF3DD" />
            <Stop offset="1" stopColor="#8FDDB2" />
          </SvgGradient>
        </Defs>
        <Circle cx={c} cy={c} r={c - 1} fill="#FFFFFF" opacity={0.08} stroke="#FFFFFF" strokeOpacity={0.28} strokeWidth={1.5} />
        <Circle cx={c} cy={c} r={R} fill="none" stroke="#FFFFFF" strokeOpacity={0.16} strokeWidth={B} />
        {frac > 0 ? <Path d={`M ${s.x} ${s.y} A ${R} ${R} 0 ${frac > 0.5 ? 1 : 0} 1 ${e.x} ${e.y}`} stroke={`url(#${id})`} strokeWidth={B} strokeLinecap="round" fill="none" /> : null}
        <Circle cx={c} cy={c} r={R - B / 2 - 1} fill="#05493A" />
        <Circle cx={e.x} cy={e.y} r={B * 0.6} fill={palette.green[800]} stroke="#9FE3BD" strokeWidth={1.5} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingTop: size * 0.08 }]}>
        <AppText style={styles.num}>
          {done}/{total}
        </AppText>
        <Image source={ART.sprout} style={{ width: size * 0.3, height: size * 0.22 }} contentFit="contain" accessible={false} />
      </View>
    </View>
  );
}

export default function Plan() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const items = state.plan.items;
  const done = items.filter((i) => i.done).length;
  const ci = checkInOn(state, state.today);
  const allDone = done === items.length && items.length > 0;
  const { width: winW } = useWindowDimensions();
  const artW = Math.round(Math.min(230, Math.max(140, winW * 0.38)));

  return (
    <Screen back right={<PhaseBadge phase={2} />}>
      {/* header with the checklist illustration on the right */}
      <View>
        <Image source={ART.clipboard} style={[styles.headerArt, { width: artW, height: artW * 0.74 }]} contentFit="contain" accessible={false} />
        <PageIntro eyebrow={formatDate(state.today, 'long')} title="Today’s plan" subtitle="A short, gentle checklist for today." style={{ paddingRight: artW * 0.66, minHeight: artW * 0.66 }} />
      </View>

      <View style={styles.hero}>
        <LinearGradient colors={[palette.green[700], palette.green[900], palette.green[950]]} locations={[0, 0.6, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Leaf size={150} color="rgba(147,207,184,0.12)" vein={false} rotate={20} style={{ position: 'absolute', top: -40, right: -40 }} />
        <Leaf size={84} color="rgba(95,181,151,0.32)" vein={false} rotate={-30} style={{ position: 'absolute', bottom: -10, right: -6 }} />
        <Leaf size={70} color="rgba(95,181,151,0.28)" vein={false} rotate={200} style={{ position: 'absolute', bottom: 10, left: -24 }} />
        <View style={styles.heroRow}>
          <PlanRing done={done} total={items.length} size={98} />
          <View style={{ flex: 1 }}>
            <AppText style={styles.heroEyebrow}>{allDone ? 'COMPLETE' : 'IN PROGRESS'}</AppText>
            <AppText style={styles.heroTitle}>{allDone ? 'All done — lovely!' : 'Small steps add up'}</AppText>
            <AppText style={styles.heroSub}>{ci ? 'Built from your check-in, goals and habits.' : 'Check in to tailor today’s plan to how you feel.'}</AppText>
          </View>
        </View>
        <View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.barFill, { width: `${items.length ? (done / items.length) * 100 : 0}%` }]} />
        </View>
      </View>

      {!ci ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Check in" onPress={() => router.push('/check-in')} style={({ pressed }) => [styles.checkIn, pressed && { transform: [{ scale: 0.98 }] }]}>
          <View style={styles.checkInFace}>
            <MoodFace mood="neutral" size={48} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.checkInTitle}>Check in first</AppText>
            <AppText style={styles.checkInSub}>Under 30 seconds</AppText>
          </View>
          <View style={styles.checkInGo}>
            <ChevronRight size={20} color={palette.lavender[700]} />
          </View>
        </Pressable>
      ) : null}

      <GroupHeader eyebrow={`${items.length - done} left`} title="Checklist" />
      <View style={{ gap: 10 }}>
        {items.length ? (
          items.map((item, i) => (
            <Pressable key={item.id} accessibilityRole="checkbox" aria-checked={item.done} onPress={() => dispatch({ type: 'TOGGLE_PLAN_ITEM', id: item.id })} style={({ pressed }) => [styles.item, item.done && styles.itemDone, pressed && { opacity: 0.9 }]}>
              <AppText variant="overline" color={item.done ? palette.green[600] : colors.textSubtle} style={styles.idx}>
                {String(i + 1).padStart(2, '0')}
              </AppText>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyBold" style={item.done ? { textDecorationLine: 'line-through', color: colors.textSubtle } : undefined}>
                  {item.title}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <KeyIcon name={item.icon} size={13} color={palette.green[600]} />
                  <AppText variant="caption" muted style={{ flex: 1 }}>
                    {item.detail}
                  </AppText>
                </View>
              </View>
              <View style={[styles.box, item.done && styles.boxOn]}>{item.done ? <Check size={16} color="#fff" /> : null}</View>
            </Pressable>
          ))
        ) : (
          <Card tone="mint">
            <EmptyState icon={ListChecks} title="No plan yet" action="Create today's plan" onAction={() => dispatch({ type: 'REGENERATE_PLAN' })} />
          </Card>
        )}
      </View>
      <Button
        label="Refresh plan"
        icon={RefreshCw}
        variant="ghost"
        onPress={() => {
          dispatch({ type: 'REGENERATE_PLAN' });
          toast('Plan refreshed');
        }}
        style={{ alignSelf: 'center', marginTop: 12 }}
      />
      <AppText variant="caption" muted center style={{ marginTop: 6 }}>
        Suggestions are general wellness ideas, not medical advice. AI-personalised plans arrive in Phase 3.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerArt: { position: 'absolute', right: -16, top: -6 },
  hero: { borderRadius: 28, padding: 18, overflow: 'hidden', shadowColor: '#0D4336', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroEyebrow: { fontFamily: font.monoMedium, fontSize: 11, letterSpacing: 2, color: '#9FE3BD' },
  heroTitle: { fontFamily: font.displayBold, fontSize: 21, lineHeight: 26, letterSpacing: -0.4, color: '#FFFFFF', marginTop: 4 },
  heroSub: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,255,255,0.86)', marginTop: 5 },
  bar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)', marginTop: 16, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: '#9FE3BD' },
  num: { fontFamily: font.displayBold, fontSize: 26, lineHeight: 30, color: '#fff' },
  checkIn: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingRight: 12, borderRadius: 26, backgroundColor: '#F6F4FF', borderWidth: 1.5, borderColor: '#ECE8FD', shadowColor: '#5B4BC4', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  checkInFace: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#E9E4FD', alignItems: 'center', justifyContent: 'center' },
  checkInTitle: { fontFamily: font.displayBold, fontSize: 18, lineHeight: 23, color: '#13261E' },
  checkInSub: { fontFamily: font.medium, fontSize: 14, lineHeight: 19, color: palette.lavender[600], marginTop: 1 },
  checkInGo: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#5B4BC4', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 22, padding: 16, borderWidth: 1.5, borderColor: colors.borderSoft },
  itemDone: { backgroundColor: palette.green[50], borderColor: palette.green[100] },
  idx: { width: 24, fontFamily: font.monoMedium, fontSize: 13 },
  box: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: palette.green[300], alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: palette.green[700], borderColor: palette.green[700] },
});
