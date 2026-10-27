/**
 * Cycle settings (SRS §10–§12): the typical cycle and period length, regularity and the first day of the
 * last period, used for estimates until enough cycles are logged. "Not sure" saves nothing (null), so the
 * app never assumes a 28-day cycle.
 */
import { COPY, cycleStateOf, estimateBasis, formatDate, type CycleProfile, type ISODate, type Regularity } from '@healthx/shared';
import { CalendarDays, Check, Info } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Disclaimer, EstimateNote } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DateSheet } from '@/components/DateSheet';
import { Chip, Stepper } from '@/components/Inputs';
import { Screen, goBack } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { GroupHeader, PageIntro } from '@/components/b-kit';
import { useStore } from '@/lib/store';
import { colors, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const REGULARITY: { key: Regularity; label: string }[] = [
  { key: 'regular', label: 'Fairly regular' },
  { key: 'irregular', label: 'Irregular' },
  { key: 'not_sure', label: 'Not sure' },
];

export default function CycleSettings() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const cp = state.cycleProfile;
  const cs = cycleStateOf(state);
  const basis = estimateBasis(state);
  const [cycleLen, setCycleLen] = useState<number | null>(cp.typicalCycleLength);
  const [periodLen, setPeriodLen] = useState<number | null>(cp.typicalPeriodLength);
  const [regularity, setRegularity] = useState<Regularity>(cp.regularity);
  const [lastStart, setLastStart] = useState<ISODate | null>(cp.lastPeriodStart);
  const [dateOpen, setDateOpen] = useState(false);

  const changed = cycleLen !== cp.typicalCycleLength || periodLen !== cp.typicalPeriodLength || regularity !== cp.regularity || lastStart !== cp.lastPeriodStart;

  const save = () => {
    const patch: Partial<CycleProfile> = { typicalCycleLength: cycleLen, typicalPeriodLength: periodLen, regularity, lastPeriodStart: lastStart };
    dispatch({ type: 'UPDATE_CYCLE_PROFILE', patch });
    toast('Cycle settings saved');
    goBack();
  };

  return (
    <Screen back footer={<Button label="Save cycle settings" icon={Check} full disabled={!changed} onPress={save} />}>
      <PageIntro eyebrow="Your cycle" title="Cycle settings" subtitle="Used for estimates until you’ve logged a few cycles. Choose “Not sure” for anything you don’t know." />

      <Card tone="mint" style={styles.basis}>
        <Info size={16} color={palette.green[700]} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyMedium">{basis.label}</AppText>
          <AppText variant="caption" muted>
            {basis.detail}
          </AppText>
          {cs.lengthSource === 'history' ? (
            <AppText variant="caption" muted style={{ marginTop: 4 }}>
              You’ve logged enough cycles, so estimates use your history{cs.avgCycleLength ? ` (about ${cs.avgCycleLength} days*)` : ''} rather than the typical length below.
            </AppText>
          ) : null}
        </View>
      </Card>

      <GroupHeader eyebrow="Usually" title="Cycle length" />
      <Card style={{ gap: 12 }}>
        {cycleLen === null ? (
          <AppText variant="small" muted>
            Not set — estimates wait for your logged periods.
          </AppText>
        ) : (
          <Stepper label="Typical cycle length" value={cycleLen} onChange={setCycleLen} min={15} max={60} format={(v) => `${v} days`} />
        )}
        <View style={styles.chips}>
          <Chip label="Not sure" selected={cycleLen === null} onPress={() => setCycleLen(cycleLen === null ? (cp.typicalCycleLength ?? 28) : null)} />
        </View>
        <AppText variant="caption" muted>
          Counted from the first day of one period to the day before the next.
        </AppText>
      </Card>

      <GroupHeader eyebrow="Usually" title="Period length" />
      <Card style={{ gap: 12 }}>
        {periodLen === null ? (
          <AppText variant="small" muted>
            Not set.
          </AppText>
        ) : (
          <Stepper label="Typical period length" value={periodLen} onChange={setPeriodLen} min={1} max={15} format={(v) => `${v} day${v === 1 ? '' : 's'}`} />
        )}
        <View style={styles.chips}>
          <Chip label="Not sure" selected={periodLen === null} onPress={() => setPeriodLen(periodLen === null ? (cp.typicalPeriodLength ?? 5) : null)} />
        </View>
      </Card>

      <GroupHeader title="How regular is your cycle?" />
      <View style={styles.chips} accessibilityRole="radiogroup">
        {REGULARITY.map((r) => (
          <Chip key={r.key} label={r.label} selected={regularity === r.key} onPress={() => setRegularity(r.key)} />
        ))}
      </View>

      <GroupHeader eyebrow="Optional" title="First day of your last period" />
      <Card style={{ gap: 10 }}>
        <AppText variant="bodyMedium">{lastStart ? formatDate(lastStart, 'long') : 'Not set'}</AppText>
        <View style={styles.chips}>
          <Button label={lastStart ? 'Change date' : 'Choose date'} icon={CalendarDays} size="sm" variant="soft" onPress={() => setDateOpen(true)} />
          {lastStart ? <Chip label="I don’t remember" selected={false} onPress={() => setLastStart(null)} /> : null}
        </View>
        <AppText variant="caption" muted>
          Periods you log in the calendar always take priority over this date.
        </AppText>
      </Card>

      {state.profile.mode === 'pregnancy' ? <Disclaimer style={{ marginTop: 14 }} text="Pregnancy mode is on: this date also sets your estimated pregnancy week, and cycle predictions are paused." /> : null}
      <EstimateNote style={{ marginTop: 14 }} />
      <AppText variant="caption" color={colors.textSubtle} style={{ marginTop: 10 }}>
        {COPY.concern}
      </AppText>

      <DateSheet
        visible={dateOpen}
        onClose={() => setDateOpen(false)}
        eyebrow="Your cycle"
        title="First day of your last period"
        value={lastStart}
        maxDate={state.today}
        onChange={(d) => {
          setLastStart(d);
          setDateOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  basis: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
});
