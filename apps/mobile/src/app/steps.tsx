/** Steps (SRS §26 activity, mockup M24): forest ring hero, glass stats, this week, manual entry and a walking video; sync is Phase 2. */
import { activeMinOn, dailySeries, estimateDistanceKm, stepsOn } from '@healthx/shared';
import { router } from 'expo-router';
import { ChevronRight, HeartPulse, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackendNote, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { BarChart } from '@/components/Charts';
import { TextField } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { StepsHero } from '@/components/StepsHero';
import { AppText } from '@/components/Text';
import { VideoCard } from '@/components/Video';
import { GroupHeader, PageIntro, TintIcon } from '@/components/b-kit';
import { useStore } from '@/lib/store';
import { palette } from '@/lib/theme';
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
  const last5 = week.slice(-5);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(String(steps || ''));
  const [error, setError] = useState<string | null>(null);

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

      <StepsHero
        steps={steps}
        target={state.stepTarget}
        note="* Distance is an estimate based on an average stride."
        stats={[
          { icon: 'distance', tone: 'mint', label: 'Distance*', value: `${estimateDistanceKm(steps).toFixed(1)} km`, days: last5.map((d) => (d.steps ? d.steps / state.stepTarget : null)) },
          { icon: 'active', tone: 'sky', label: 'Active', value: `${active} min`, days: last5.map((d) => (d.activeMin ? d.activeMin / 30 : null)) },
          { icon: 'trend', tone: 'lavender', label: 'Week avg', value: weekAvg.toLocaleString(), days: last5.map((d) => (d.steps ? d.steps / Math.max(weekAvg, 1) / 1.5 : null)) },
        ]}
      />

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
  sync: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderRadius: 22, backgroundColor: palette.rose[50], borderWidth: 1, borderColor: palette.rose[100] },
});

