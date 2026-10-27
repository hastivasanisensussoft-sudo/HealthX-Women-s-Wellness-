/** Steps (SRS §26 activity, mockup M24): forest ring hero, glass stats, this week, manual entry and a walking video; sync is Phase 2. */
import { activeMinOn, dailySeries, estimateDistanceKm, stepsOn } from '@healthx/shared';
import { router } from 'expo-router';
import { ChevronRight, Clock, Footprints, HeartPulse, MapPin, Plus, TrendingUp } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackendNote, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { BarChart, ProgressRing } from '@/components/Charts';
import { TextField } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { VideoCard } from '@/components/Video';
import { GlassStat, GroupHeader, HeroPanel, PageIntro, TintIcon, ON_DARK } from '@/components/b-kit';
import { useStore } from '@/lib/store';
import { font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';


export default function Steps() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const steps = stepsOn(state, state.today);
  const active = activeMinOn(state, state.today);
  const week = useMemo(() => dailySeries(state, 7), [state]);
  const logged = week.filter((d) => d.steps > 0);
  const weekAvg = logged.length ? Math.round(logged.reduce((a, d) => a + d.steps, 0) / logged.length) : 0;
  const goalDays = week.filter((d) => d.steps >= state.stepTarget).length;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(String(steps || ''));
  const [error, setError] = useState<string | null>(null);
  const pct = steps / state.stepTarget;

  const save = () => {
    const n = Number(input);
    if (!input || !Number.isInteger(n) || n < 0) return setError('Enter a whole number of steps.');
    if (n > 80000) return setError('That looks too high — please check.');
    setError(null);
    dispatch({ type: 'SET_STEPS', date: state.today, steps: n });
    toast(`Steps updated to ${n.toLocaleString()}`);
    setOpen(false);
  };

  return (
    <Screen back>
      <PageIntro eyebrow="Activity · today" title="Steps" subtitle="Every step counts — any pace that feels good." />

      <HeroPanel>
        <View style={{ alignItems: 'center' }}>
          <ProgressRing value={pct} size={196} stroke={16} color={palette.butter[400]} track="rgba(255,255,255,0.14)">
            <Footprints size={20} color={ON_DARK.soft} />
            <AppText style={styles.big}>{steps.toLocaleString()}</AppText>
            <AppText variant="small" color={ON_DARK.text}>
              of {state.stepTarget.toLocaleString()} steps
            </AppText>
          </ProgressRing>
          <View style={styles.pctPill}>
            <AppText variant="caption" color={palette.green[950]} style={{ fontFamily: font.bold }}>
              {pct >= 1 ? 'Goal reached today' : `${Math.round(pct * 100)}% of today’s goal`}
            </AppText>
          </View>
        </View>
        <View style={styles.glassRow}>
          <GlassStat label="Distance*" value={`${estimateDistanceKm(steps).toFixed(1)} km`} icon={<MapPin size={15} color={ON_DARK.soft} />} />
          <GlassStat label="Active" value={`${active} min`} icon={<Clock size={15} color={ON_DARK.soft} />} />
          <GlassStat label="Week avg" value={weekAvg.toLocaleString()} icon={<TrendingUp size={15} color={ON_DARK.soft} />} />
        </View>
      </HeroPanel>
      <AppText variant="caption" muted style={{ marginTop: 8 }}>
        * Distance is an estimate based on an average stride.
      </AppText>

      <Button label="Add steps manually" icon={Plus} full style={{ marginTop: 16 }} onPress={() => setOpen(true)} />

      <GroupHeader eyebrow={`Goal met ${goalDays} of 7 days`} title="This week" />
      <Card>
        <BarChart
          data={week.map((d) => ({ label: d.label.charAt(0), value: d.steps, highlight: d.date === state.today }))}
          target={state.stepTarget}
          color={palette.green[500]}
          highlightColor={palette.green[700]}
          height={160}
        />
        <AppText variant="caption" muted>
          Dashed line = your {state.stepTarget.toLocaleString()}-step goal · highlighted bar = today
        </AppText>
      </Card>

      <GroupHeader eyebrow="Video preview" title="Take it outside" />
      <VideoCard video="walk-outdoors" width="100%" height={190} />

      <Pressable accessibilityRole="button" accessibilityLabel="Connect Apple Health or Health Connect" onPress={() => router.push('/integrations' as never)} style={({ pressed }) => [styles.sync, pressed && { opacity: 0.92 }]}>
        <TintIcon icon={HeartPulse} tone="rose" size={42} solid />
        <View style={{ flex: 1 }}>
          <AppText variant="h3">Sync steps automatically</AppText>
          <AppText variant="small" muted>
            Connect Apple Health / Health Connect
          </AppText>
          <PhaseBadge phase={2} style={{ marginTop: 6 }} />
        </View>
        <ChevronRight size={18} color={palette.green[700]} />
      </Pressable>
      <BackendNote style={{ marginTop: 12 }} text="Manual entry in the MVP (D-04). Automatic sync needs device permissions and the integrations backend." />

      <Sheet visible={open} onClose={() => setOpen(false)} title="Today's steps" subtitle="Enter your total steps for today." footer={<Button label="Save steps" full onPress={save} />}>
        <TextField label="Steps" value={input} onChangeText={(v) => setInput(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="e.g. 6500" error={error} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  big: { fontFamily: font.displayBold, fontSize: 40, lineHeight: 46, color: '#fff', letterSpacing: -1, marginTop: 2 },
  pctPill: { marginTop: 12, backgroundColor: palette.butter[400], borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  glassRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  sync: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderRadius: 22, backgroundColor: palette.rose[50], borderWidth: 1, borderColor: palette.rose[100] },
});

