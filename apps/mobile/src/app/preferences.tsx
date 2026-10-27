/** Preferences: units [ADD A-16], language, timezone (SRS §9, §72 localisation readiness). */
import { LANGUAGES, TIMEZONES, type Units } from '@healthx/shared';
import { Clock3, Languages, Ruler, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackendNote } from '@/components/Badges';
import { Card } from '@/components/Card';
import { Chip, Segmented } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { PageIntro, TintIcon, type Tone } from '@/components/b-kit';
import { useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';

export default function Preferences() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const p = state.profile;
  const update = (patch: Partial<typeof p>, msg: string) => {
    dispatch({ type: 'UPDATE_PROFILE', patch });
    toast(msg);
  };
  return (
    <Screen back>
      <PageIntro eyebrow="Units, language & region" title="Preferences" subtitle="Make HealthX read the way you do." />

      <Section icon={Ruler} tone="green" title="Units" value={p.units === 'metric' ? 'Metric' : 'Imperial'}>
        <Segmented<Units> value={p.units} onChange={(u) => update({ units: u }, u === 'metric' ? 'Using metric units' : 'Using imperial units')} options={[{ key: 'metric', label: 'Metric (L, kg, cm)' }, { key: 'imperial', label: 'Imperial (oz, lb, in)' }]} />
      </Section>

      <Section icon={Languages} tone="lavender" title="Language" value={p.language}>
        <View style={styles.wrap}>
          {LANGUAGES.map((l) => (
            <Chip key={l} label={l} selected={p.language === l} onPress={() => update({ language: l }, `Language set to ${l}`)} />
          ))}
        </View>
        <AppText variant="caption" muted style={{ marginTop: 10 }}>
          The interface is localisation-ready; translations beyond English arrive once launch languages are confirmed (D-15).
        </AppText>
      </Section>

      <Section icon={Clock3} tone="sky" title="Time zone" value={p.timezone.replace('_', ' ')}>
        <View style={styles.wrap}>
          {TIMEZONES.map((t) => (
            <Chip key={t} label={t.replace('_', ' ')} selected={p.timezone === t} onPress={() => update({ timezone: t }, 'Time zone updated — reminders rescheduled')} />
          ))}
        </View>
        <AppText variant="caption" muted style={{ marginTop: 10 }}>
          Cycle days use your local calendar date, so travelling never shifts your logs.
        </AppText>
      </Section>
      <BackendNote style={{ marginTop: 14 }} text="Saved on this device in the demo; syncs across devices once the profile API exists." />
    </Screen>
  );
}

function Section({ icon, tone, title, value, children }: { icon: LucideIcon; tone: Tone; title: string; value: string; children: ReactNode }) {
  return (
    <Card style={{ marginBottom: 14 }}>
      <View style={styles.head}>
        <TintIcon icon={icon} tone={tone} size={40} />
        <View style={{ flex: 1 }}>
          <AppText variant="h3">{title}</AppText>
          <AppText variant="caption" muted>
            Current: {value}
          </AppText>
        </View>
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
