import {
  addDays,
  addMonths,
  classifyDay,
  formatDate,
  monthGrid,
  sameMonth,
  startOfMonth,
  type CycleState,
  type ISODate,
  type PeriodLog,
} from '@healthx/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../Text';
import { brandText, colors, fertile, font, palette } from '@/lib/theme';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Kind = ReturnType<typeof classifyDay>;
type Band = 'period' | 'predicted' | 'fertile' | null;
const bandOf = (k: Kind): Band => (k === 'period' ? 'period' : k === 'predicted_period' ? 'predicted' : k === 'fertile_estimate' || k === 'ovulation_estimate' ? 'fertile' : null);
const BAND_BG: Record<Exclude<Band, null>, string> = { period: palette.rose[100], predicted: palette.rose[50], fertile: fertile[100] };

function DayCell({
  day,
  kind,
  band,
  joinL,
  joinR,
  isToday,
  inMonth,
  dots,
  selected,
  disabled,
  onPress,
  size = 38,
}: {
  day: ISODate;
  kind: Kind;
  band: Band;
  joinL: boolean;
  joinR: boolean;
  isToday: boolean;
  inMonth: boolean;
  dots?: string[];
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  size?: number;
}) {
  const solid = kind === 'period';
  const fg = solid || (selected && !band) ? '#fff' : kind === 'predicted_period' ? palette.rose[700] : band === 'fertile' ? fertile[700] : inMonth ? colors.text : colors.textSubtle;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${formatDate(day, 'long')}${kind !== 'none' ? `, ${kind.replace('_', ' ')}` : ''}`}
      aria-selected={!!selected} aria-disabled={!!disabled}
      disabled={disabled}
      onPress={onPress}
      style={[styles.cellWrap, !inMonth && { opacity: 0.4 }]}>
      {band ? (
        <View
          pointerEvents="none"
          style={[
            styles.band,
            { backgroundColor: BAND_BG[band] },
            joinL ? { left: 0 } : { left: 3, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
            joinR ? { right: 0 } : { right: 3, borderTopRightRadius: 20, borderBottomRightRadius: 20 },
          ]}
        />
      ) : null}
      <View
        style={[
          styles.cell,
          { width: size, height: size, borderRadius: size / 2 },
          solid && { backgroundColor: palette.rose[500] },
          kind === 'predicted_period' && styles.dashedRose,
          kind === 'ovulation_estimate' && styles.dashedGreen,
          selected && !solid && !band && { backgroundColor: palette.green[800] },
          selected && (solid || !!band) && styles.selectedRing,
          isToday && !selected && kind === 'none' && styles.today,
          disabled && { opacity: 0.35 },
        ]}>
        <AppText variant="smallMedium" color={fg} style={{ fontFamily: font.semibold }}>
          {Number(day.slice(8))}
        </AppText>
      </View>
      <View style={styles.dots}>
        {(dots ?? []).slice(0, 3).map((c, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: c }]} />
        ))}
      </View>
    </Pressable>
  );
}

export function MonthCalendar({
  month,
  onMonthChange,
  periods,
  state,
  dotsFor,
  selected,
  onSelect,
  maxDate,
  showEstimates = true,
}: {
  month: ISODate;
  onMonthChange: (m: ISODate) => void;
  periods: PeriodLog[];
  state: CycleState;
  dotsFor?: (d: ISODate) => string[];
  selected?: ISODate | null;
  onSelect?: (d: ISODate) => void;
  maxDate?: ISODate;
  showEstimates?: boolean;
}) {
  const grid = useMemo(() => monthGrid(month), [month]);
  return (
    <View>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => onMonthChange(addMonths(month, -1))} style={styles.navBtn} hitSlop={6}>
          <ChevronLeft size={18} color={colors.text} />
        </Pressable>
        <AppText variant="h2">{formatDate(startOfMonth(month), 'month')}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => onMonthChange(addMonths(month, 1))} style={styles.navBtn} hitSlop={6}>
          <ChevronRight size={18} color={colors.text} />
        </Pressable>
      </View>
      <View style={[styles.row, styles.wdRow]}>
        {WEEKDAYS.map((w, i) => (
          <AppText key={i} variant="overline" color={colors.textSubtle} style={styles.wd}>
            {w}
          </AppText>
        ))}
      </View>
      {grid.map((week, wi) => {
        const kinds = week.map((d) => {
          const k = classifyDay(d, periods, state);
          return !showEstimates && k !== 'period' ? ('none' as Kind) : k;
        });
        const bands = kinds.map(bandOf);
        return (
          <View key={wi} style={styles.row}>
            {week.map((d, i) => (
              <DayCell
                key={d}
                day={d}
                kind={kinds[i]}
                band={bands[i]}
                joinL={bands[i] !== null && i > 0 && bands[i - 1] === bands[i]}
                joinR={bands[i] !== null && i < 6 && bands[i + 1] === bands[i]}
                isToday={d === state.today}
                inMonth={sameMonth(d, month)}
                dots={dotsFor?.(d)}
                selected={selected === d}
                disabled={!!maxDate && d > maxDate}
                onPress={onSelect ? () => onSelect(d) : undefined}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

/** Seven-day strip (Mira reference): the selected day is a mint pill holding weekday and date. */
export function WeekStrip({ state, periods, onSelect, selected }: { state: CycleState; periods: PeriodLog[]; onSelect?: (d: ISODate) => void; selected?: ISODate }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(state.today, i - 3));
  return (
    <View style={styles.week}>
      {days.map((d) => {
        const kind = classifyDay(d, periods, state);
        const isToday = d === state.today;
        const sel = selected ? selected === d : isToday;
        const markColor = kind === 'period' ? palette.rose[500] : kind === 'predicted_period' ? palette.rose[300] : kind === 'none' ? 'transparent' : fertile[400];
        return (
          <Pressable
            key={d}
            accessibilityRole="button"
            accessibilityLabel={`${formatDate(d, 'long')}${isToday ? ', today' : ''}`}
            aria-selected={sel}
            onPress={() => onSelect?.(d)}
            style={[styles.weekItem, sel && styles.weekSel]}>
            <AppText variant="overline" color={sel ? brandText : colors.textSubtle} style={{ letterSpacing: 0.8 }}>
              {isToday ? 'Today' : formatDate(d, 'weekday').slice(0, 3)}
            </AppText>
            <AppText style={{ fontFamily: font.display, fontSize: 19, lineHeight: 24, color: colors.text }}>{Number(d.slice(8))}</AppText>
            <View
              style={[
                styles.weekDot,
                { backgroundColor: markColor },
                kind === 'predicted_period' && { backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: palette.rose[400] },
                kind === 'ovulation_estimate' && { backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: fertile[700] },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[200], alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  wdRow: { borderBottomWidth: 1, borderBottomColor: palette.ink[100], marginBottom: 6, paddingBottom: 6 },
  wd: { flex: 1, textAlign: 'center' },
  cellWrap: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  band: { position: 'absolute', top: 6, height: 38 },
  cell: { alignItems: 'center', justifyContent: 'center' },
  dashedRose: { borderWidth: 1.8, borderColor: palette.rose[300], borderStyle: 'dashed', backgroundColor: colors.surface },
  dashedGreen: { borderWidth: 1.8, borderColor: fertile[600], borderStyle: 'dashed', backgroundColor: colors.surface },
  selectedRing: { borderWidth: 2.5, borderColor: brandText },
  today: { borderWidth: 2, borderColor: palette.green[700], backgroundColor: palette.green[50] },
  dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  week: { flexDirection: 'row', justifyContent: 'space-between', gap: 2 },
  weekItem: { alignItems: 'center', gap: 4, flex: 1, paddingVertical: 8, borderRadius: 18 },
  weekSel: { backgroundColor: palette.green[100], borderWidth: 1, borderColor: palette.green[200] },
  weekDot: { width: 7, height: 7, borderRadius: 4 },
});
