/** Sleep (SRS §30): indigo night hero, bedtime / wake / quality / waking log, 7-night chart and a wind-down video. Full module is Phase 2. */
import { addDays, dailySeries, formatClock, formatDate, sleepDuration, sleepOn, type SleepLog } from '@healthx/shared';
import { router } from 'expo-router';
import { BedDouble, ChevronRight, Moon, MoonStar, Star, Sunrise, Timer } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackendNote, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { BarChart } from '@/components/Charts';
import { EmptyState } from '@/components/Feedback';
import { Stepper } from '@/components/Inputs';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { VideoCard } from '@/components/Video';
import { GlassStat, GroupHeader, HeroPanel, PageIntro, TintIcon, ON_DARK } from '@/components/b-kit';
import { useStore } from '@/lib/store';
import { colors, font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const toClock = (m: number) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const STARS: [number, number, number][] = [
  [18, 22, 3],
  [62, 14, 2],
  [86, 40, 2.5],
  [40, 60, 2],
  [92, 72, 3],
];

export default function Sleep() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const last = sleepOn(state, state.today) ?? sleepOn(state, addDays(state.today, -1));
  const [bed, setBed] = useState(toMin(last?.bedtime ?? '22:45'));
  const [wake, setWake] = useState(toMin(last?.wake ?? '06:45'));
  const [quality, setQuality] = useState<SleepLog['quality']>(last?.quality ?? 4);
  const [wakings, setWakings] = useState(last?.wakings ?? 1);
  const dur = sleepDuration(toClock(bed), toClock(wake));
  const week = useMemo(() => dailySeries(state, 7), [state]);
  const avg = week.filter((d) => d.sleep !== null);
  const avgH = avg.length ? avg.reduce((a, d) => a + (d.sleep as number), 0) / avg.length : null;

  const save = () => {
    if (dur < 60 || dur > 16 * 60) return toast('Sleep must be between 1 and 16 hours — check your times.', 'error');
    dispatch({ type: 'LOG_SLEEP', log: { date: state.today, bedtime: toClock(bed), wake: toClock(wake), durationMin: dur, quality, wakings, source: 'manual' } });
    toast(`Logged ${Math.floor(dur / 60)}h ${dur % 60}m of sleep`);
  };

  return (
    <Screen back right={<PhaseBadge phase={2} />}>
      <PageIntro eyebrow="Rest & recovery" title="Sleep" subtitle="Log your night in a few taps and spot gentle patterns." />

      {/* Night hero */}
      <HeroPanel tone="night" leaves={false}>
        {STARS.map(([x, y, r]) => (
          <View key={`${x}-${y}`} style={[styles.star, { left: `${x}%`, top: `${y}%`, width: r * 2, height: r * 2, borderRadius: r }]} />
        ))}
        <View style={styles.moonGlow} />
        <View style={styles.nightTop}>
          <View style={styles.moon}>
            <MoonStar size={30} color={palette.butter[400]} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="overline" color={ON_DARK.soft}>
              Last night
            </AppText>
            {last ? (
              <>
                <AppText style={styles.big}>
                  {Math.floor(last.durationMin / 60)}h {last.durationMin % 60}m
                </AppText>
                <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }} accessible accessibilityLabel={`Quality ${last.quality} of 5`}>
                  {[1, 2, 3, 4, 5].map((q) => (
                    <Star key={q} size={14} color={palette.butter[400]} fill={q <= last.quality ? palette.butter[400] : 'transparent'} />
                  ))}
                </View>
              </>
            ) : (
              <AppText variant="h2" color="#fff" style={{ marginTop: 2 }}>
                Not logged yet
              </AppText>
            )}
          </View>
        </View>
        {last ? (
          <View style={styles.glassRow}>
            <GlassStat label="Bedtime" value={formatClock(last.bedtime)} icon={<BedDouble size={16} color={ON_DARK.soft} />} />
            <GlassStat label="Woke up" value={formatClock(last.wake)} icon={<Sunrise size={16} color={palette.peach[400]} />} />
            <GlassStat label="Waking" value={`${last.wakings}×`} icon={<Moon size={16} color={ON_DARK.soft} />} />
          </View>
        ) : null}
      </HeroPanel>

      {/* Log */}
      <GroupHeader eyebrow="Log" title="Log last night" />
      <Card style={{ gap: 16 }}>
        <View style={{ gap: 8 }}>
          <View style={styles.timeRow}>
            <TintIcon icon={BedDouble} tone="indigo" size={34} />
            <AppText variant="bodyMedium">Bedtime</AppText>
          </View>
          <Stepper label="Bedtime" value={bed} onChange={setBed} step={15} min={-10000} max={10000} format={(v) => formatClock(toClock(v))} />
        </View>
        <View style={{ gap: 8 }}>
          <View style={styles.timeRow}>
            <TintIcon icon={Sunrise} tone="peach" size={34} />
            <AppText variant="bodyMedium">Wake time</AppText>
          </View>
          <Stepper label="Wake time" value={wake} onChange={setWake} step={15} min={-10000} max={10000} format={(v) => formatClock(toClock(v))} />
        </View>
        <View style={styles.duration}>
          <Timer size={18} color={palette.indigo[600]} />
          <AppText variant="small" color={palette.indigo[700]} style={{ flex: 1 }}>
            Duration
          </AppText>
          <AppText style={styles.dur}>
            {Math.floor(dur / 60)}h {dur % 60}m
          </AppText>
        </View>
        <View>
          <AppText variant="bodyMedium" style={{ marginBottom: 8 }}>
            Sleep quality
          </AppText>
          <View style={{ flexDirection: 'row', gap: 10 }} accessibilityRole="radiogroup">
            {([1, 2, 3, 4, 5] as const).map((q) => (
              <Pressable key={q} accessibilityRole="radio" accessibilityLabel={`Quality ${q} of 5`} aria-selected={quality === q} onPress={() => setQuality(q)} hitSlop={4} style={[styles.starBtn, q <= quality && styles.starOn]}>
                <Star size={24} color={palette.butter[500]} fill={q <= quality ? palette.butter[400] : 'transparent'} />
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <View style={styles.timeRow}>
            <TintIcon icon={Moon} tone="lavender" size={34} />
            <AppText variant="bodyMedium">Night waking</AppText>
          </View>
          <Stepper label="Night waking" value={wakings} onChange={setWakings} min={0} max={10} format={(v) => `${v}×`} />
        </View>
        <Button label="Save sleep" full onPress={save} />
      </Card>

      {/* Trend */}
      <GroupHeader eyebrow="Trend" title="Last 7 nights" />
      <Card>
        {avg.length ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
              <AppText style={styles.dur}>{avgH ? `${Math.floor(avgH)}h ${Math.round((avgH % 1) * 60)}m` : '—'}</AppText>
              <AppText variant="small" muted>
                average · target {state.sleepTargetHours} h
              </AppText>
            </View>
            <BarChart data={week.map((d) => ({ label: d.label, value: d.sleep, highlight: d.sleep !== null && d.sleep < state.sleepTargetHours - 0.5 }))} target={state.sleepTargetHours} color={palette.indigo[400]} highlightColor={palette.peach[400]} showValues formatValue={(v) => v.toFixed(1)} />
            <AppText variant="caption" muted>
              Peach bars = more than 30 minutes under your target.
            </AppText>
          </>
        ) : (
          <EmptyState icon={Moon} title="No sleep logged" text="Log a night above to see your trend." />
        )}
      </Card>

      {/* Wind down */}
      <GroupHeader eyebrow="Video preview" title="Wind down tonight" />
      <VideoCard video="sleep-winddown" width="100%" height={190} />
      <Pressable accessibilityRole="button" accessibilityLabel="Read: building an evening routine" onPress={() => router.push({ pathname: '/learn/[id]', params: { id: 'a_sleep_routine' } })} style={({ pressed }) => [styles.read, pressed && { opacity: 0.92 }]}>
        <Photo photo="herbal-tea" radius={18} style={styles.readImg} />
        <View style={{ flex: 1 }}>
          <AppText variant="overline" color={palette.indigo[600]}>
            Read
          </AppText>
          <AppText variant="h3" numberOfLines={2}>
            Building a calm evening routine
          </AppText>
        </View>
        <ChevronRight size={18} color={palette.indigo[600]} />
      </Pressable>

      <BackendNote style={{ marginTop: 16 }} text={`Apple Health / Health Connect sleep import arrives in Phase 2 — requires native integrations. Logged ${formatDate(state.today, 'short')} data is stored on this device only.`} />
      <AppText variant="caption" muted style={{ marginTop: 12, color: colors.textSubtle }}>
        If sleep problems continue, a qualified healthcare professional can help.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  star: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.75)' },
  moonGlow: { position: 'absolute', top: -60, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(250,215,114,0.10)' },
  nightTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  moon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  big: { fontFamily: font.displayBold, fontSize: 36, lineHeight: 42, color: '#fff', letterSpacing: -0.8 },
  glassRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  duration: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: palette.indigo[50], borderRadius: 18, padding: 14 },
  dur: { fontFamily: font.display, fontSize: 22, lineHeight: 28, color: palette.indigo[700] },
  starBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ink[50] },
  starOn: { backgroundColor: palette.butter[50] },
  read: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 10, paddingRight: 14, borderRadius: 22, backgroundColor: palette.indigo[50], borderWidth: 1, borderColor: palette.indigo[100] },
  readImg: { width: 64, height: 64 },
});
