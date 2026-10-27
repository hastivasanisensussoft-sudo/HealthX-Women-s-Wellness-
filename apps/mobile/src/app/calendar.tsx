/** Month calendar with logged / estimated days (SRS §18, §58, §61; Mira range calendar). Tapping a day opens its day detail (mockup M18). */
import { checkInOn, cycleStateOf, formatDate, symptomsOn, type ISODate } from '@healthx/shared';
import { router } from 'expo-router';
import { Droplet, Hand, Plus, Sprout } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EstimateNote } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Legend } from '@/components/Charts';
import { MonthCalendar } from '@/components/cycle/Calendar';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { useStore } from '@/lib/store';
import { brandText, colors, fertile, font, palette } from '@/lib/theme';

export default function CalendarScreen() {
  const { state } = useStore();
  const cs = useMemo(() => cycleStateOf(state), [state]);
  const [month, setMonth] = useState(state.today);

  const dotsFor = (d: ISODate) => {
    const dots: string[] = [];
    if (symptomsOn(state, d).length) dots.push(palette.peach[500]);
    if (checkInOn(state, d)) dots.push(palette.lavender[500]);
    if (state.sessions.some((s) => s.date === d)) dots.push(palette.green[500]);
    return dots;
  };

  return (
    <Screen back largeTitle eyebrow="Logged & estimated days" title="Calendar" footer={<Button label="Log Period" icon={Plus} variant="rose" size="lg" full onPress={() => router.push('/log-period')} />}>
      {cs.hasData ? (
        <View style={styles.summary}>
          <View style={[styles.stat, { backgroundColor: palette.rose[50], borderColor: palette.rose[100] }]}>
            <View style={styles.statIcon}>
              <Droplet size={16} color={palette.rose[500]} fill={palette.rose[200]} />
            </View>
            <AppText variant="overline" color={palette.rose[700]} style={{ fontSize: 9.5 }}>
              {cs.inPeriod ? 'Period' : 'Next period'}
            </AppText>
            <AppText style={styles.statValue}>{cs.inPeriod ? `Day ${cs.periodDay}` : cs.nextPeriodStart ? `${formatDate(cs.nextPeriodStart, 'short')}*` : '—'}</AppText>
          </View>
          <View style={[styles.stat, { backgroundColor: fertile[50], borderColor: fertile[100] }]}>
            <View style={styles.statIcon}>
              <Sprout size={16} color={fertile[700]} />
            </View>
            <AppText variant="overline" color={fertile[700]} style={{ fontSize: 9.5 }}>
              Fertile window*
            </AppText>
            <AppText style={styles.statValue} numberOfLines={1}>
              {cs.fertileWindow ? `${formatDate(cs.fertileWindow.start, 'short')} – ${Number(cs.fertileWindow.end.slice(8))}` : '—'}
            </AppText>
          </View>
        </View>
      ) : null}

      <Card style={{ marginTop: cs.hasData ? 14 : 0 }}>
        <MonthCalendar month={month} onMonthChange={setMonth} periods={state.periods} state={cs} dotsFor={dotsFor} onSelect={(d) => router.push({ pathname: '/day/[date]', params: { date: d } })} />
        <Legend
          items={[
            { color: palette.rose[500], label: 'Logged' },
            { color: palette.rose[300], label: 'Predicted*', dashed: true },
            { color: fertile[300], label: 'Fertile window*' },
            { color: palette.green[700], label: 'Today', dashed: false },
          ]}
        />
        <View style={styles.dotLegend}>
          {[
            [palette.peach[500], 'Symptoms'],
            [palette.lavender[500], 'Check-in'],
            [palette.green[500], 'Workout'],
          ].map(([c, l]) => (
            <View key={l} style={styles.dotItem}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c }} />
              <AppText variant="caption" color={palette.ink[700]}>
                {l}
              </AppText>
            </View>
          ))}
        </View>
      </Card>
      <EstimateNote style={{ marginTop: 12 }} compact text="* Estimate based on the information you've provided — not a confirmation of ovulation." />
      <View style={styles.hint}>
        <Hand size={15} color={palette.green[700]} />
        <AppText variant="caption" color={brandText} style={{ flex: 1 }}>
          Tap any day to see or edit what you logged.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: 22, borderWidth: 1, padding: 14, gap: 4 },
  statIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontFamily: font.display, fontSize: 19, lineHeight: 24, color: colors.text },
  dotLegend: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  dotItem: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: palette.ink[100], borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: palette.green[50], borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
});
