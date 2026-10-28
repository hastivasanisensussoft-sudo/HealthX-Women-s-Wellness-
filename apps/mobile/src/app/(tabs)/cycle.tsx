/** Cycle tab (mockup M13; Mira / Moonly references): phase dial hero, range calendar, phases, quick links, media and recent periods. */
import { COPY, PHASES, cycleStateOf, diffDays, estimateBasis, formatDate, phaseColors, sortPeriods, type CyclePhase } from '@healthx/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Baby, CalendarDays, ChevronRight, Droplet, Flower2, History, Pencil, Plus, Settings2, Smile, Stethoscope } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ArticleCard } from '@/components/ArticleCard';
import { Leaf } from '@/components/Art';
import { Disclaimer, EstimateNote, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card, SectionHeader } from '@/components/Card';
import { Legend } from '@/components/Charts';
import { HERO_COLORS, HeroDial, type HeroPhase } from '@/components/cycle/HeroDial';
import { MonthCalendar } from '@/components/cycle/Calendar';
import { EmptyState, SkeletonCard } from '@/components/Feedback';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { QuickTile } from '@/components/Tiles';
import { VideoCard } from '@/components/Video';
import { phaseText } from '@/lib/cycleText';
import { useDemoLoading } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import { brandText, colors, fertile, font, onDark, palette, shadow } from '@/lib/theme';

const ORDER: CyclePhase[] = ['menstrual', 'follicular', 'ovulatory', 'luteal'];
/** Hero card: app phase → the card's own arc colour, and the short legend names. */
const HERO_OF: Record<CyclePhase, HeroPhase> = { menstrual: 'period', follicular: 'follicular', ovulatory: 'fertile', luteal: 'luteal' };
const LEGEND_NAME: Record<CyclePhase, string> = { menstrual: 'Period', follicular: 'Follicular', ovulatory: 'Ovulation', luteal: 'Luteal' };

export default function CycleTab() {
  const { state } = useStore();
  const loading = useDemoLoading(450);
  const cs = useMemo(() => cycleStateOf(state), [state]);
  const [phaseSheet, setPhaseSheet] = useState<CyclePhase | null>(null);
  const [month, setMonth] = useState(state.today);
  const recent = sortPeriods(state.periods).slice(-3).reverse();
  const openPeriod = state.periods.find((p) => p.end === null);
  const comfort = state.articles.find((a) => a.id === 'a_cramps_comfort' && a.status === 'published');
  // Pregnancy mode pauses period and phase estimates (D-21); menopause mode turns them off, as it works
  // without period data (P3-04). Logged history stays visible in both.
  const menopause = state.profile.mode === 'menopause';
  const paused = state.profile.mode === 'pregnancy' || menopause;
  const pausedWord = menopause ? 'off' : 'paused';
  const basis = estimateBasis(state);
  // dial ≈ 46% of the card's inner width (screen − 2×20 padding − 2×18 card padding), 148–230 px
  const { width: winW } = useWindowDimensions();
  const dial = Math.round(Math.min(230, Math.max(148, (winW - 76) * 0.46)));
  // phones: legend as a 2×2 grid and compact stat cards; wider screens: one legend row like the design
  const narrow = winW < 520;

  const phaseRanges = useMemo(() => {
    if (!cs.avgCycleLength || !cs.fertileWindow || !cs.currentCycleStart) return null;
    const pl = cs.avgPeriodLength ?? 5;
    const fs = diffDays(cs.currentCycleStart, cs.fertileWindow.start) + 1;
    const fe = diffDays(cs.currentCycleStart, cs.fertileWindow.end) + 1;
    return {
      menstrual: `Days 1–${pl}`,
      follicular: `Days ${pl + 1}–${fs - 1}`,
      ovulatory: `Days ${fs}–${fe}`,
      luteal: `Days ${fe + 1}–${cs.avgCycleLength}`,
    } as Record<CyclePhase, string>;
  }, [cs]);

  const nextLabel = openPeriod ? 'Period' : 'Next period';
  const nextValue = openPeriod ? `Day ${diffDays(openPeriod.start, state.today) + 1}` : paused ? (menopause ? 'Off' : 'Paused') : cs.daysUntilNextPeriod != null ? `~${Math.max(0, cs.daysUntilNextPeriod)} days*` : '—';

  return (
    <Screen title="Cycle" eyebrow={cs.hasData && cs.cycleDay ? `Cycle day ${cs.cycleDay}` : 'Your cycle'} subtitle="Estimates learn from the periods you log." largeTitle tabBarSpace>
      {menopause && !loading ? (
        <Card tone="lavender" style={{ marginBottom: 14, gap: 8 }} onPress={() => router.push({ pathname: '/life-stage/[mode]', params: { mode: 'menopause' } })} accessibilityLabel="Menopause mode is on. Open menopause">
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Flower2 size={18} color={palette.lavender[700]} />
            <AppText variant="bodyMedium" style={{ flex: 1 }}>
              Menopause mode is on
            </AppText>
            <ChevronRight size={16} color={palette.lavender[700]} />
          </View>
          <AppText variant="caption" muted>
            Period estimates, phases and period reminders are off. You can still log any bleeding, and your history is kept.
          </AppText>
        </Card>
      ) : null}
      {paused && !menopause && !loading ? (
        <Card tone="mint" style={{ marginBottom: 14, gap: 8 }} onPress={() => router.push({ pathname: '/life-stage/[mode]', params: { mode: 'pregnancy' } })} accessibilityLabel="Pregnancy mode is on. Open pregnancy wellness">
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Baby size={18} color={palette.green[700]} />
            <AppText variant="bodyMedium" style={{ flex: 1 }}>
              Pregnancy mode is on
            </AppText>
            <ChevronRight size={16} color={palette.green[700]} />
          </View>
          <AppText variant="caption" muted>
            Period estimates, phases and period reminders are paused. Your logged history is kept.
          </AppText>
        </Card>
      ) : null}
      {loading ? (
        <View style={{ gap: 12 }}>
          <SkeletonCard height={230} />
          <SkeletonCard height={320} />
          <SkeletonCard />
        </View>
      ) : !cs.hasData ? (
        <Card>
          <EmptyState icon={CalendarDays} tone="rose" title="No cycle data yet" text="Log your most recent period to start seeing your cycle day and estimates." action="Log a period" onAction={() => router.push('/log-period')} />
          <Button label="Or add your typical cycle length" icon={Settings2} variant="ghost" size="sm" onPress={() => router.push('/cycle-settings')} style={{ alignSelf: 'center', marginTop: 4 }} />
        </Card>
      ) : (
        <>
          {/* Dial hero (forest panel) */}
          <View style={styles.hero}>
            <LinearGradient colors={[palette.green[700], palette.green[900], palette.green[950]]} locations={[0, 0.6, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Leaf size={150} color={palette.green[300]} rotate={-20} style={{ right: -40, top: -46, opacity: 0.14 }} />
            <Leaf size={92} color={palette.green[400]} rotate={-150} style={{ left: -26, top: 44, opacity: 0.2 }} />
            <Leaf size={70} color={palette.green[400]} rotate={30} style={{ left: dial * 0.62, top: -14, opacity: 0.18 }} />
            <Leaf size={84} color={palette.green[300]} rotate={150} style={{ right: -24, top: 150, opacity: 0.1 }} />
            <View style={styles.heroRow}>
              <HeroDial state={cs} size={dial} />
              <View style={{ flex: 1, gap: 10 }}>
                <View>
                  <AppText variant="overline" color={onDark.green[200]}>
                    {nextLabel}
                  </AppText>
                  <AppText style={styles.heroBig} numberOfLines={1} adjustsFontSizeToFit>
                    {nextValue}
                  </AppText>
                  {!openPeriod && !paused && cs.nextPeriodStart ? (
                    <AppText variant="caption" color={onDark.green[100]}>
                      around {formatDate(cs.nextPeriodStart, 'short')}*
                    </AppText>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${paused ? `Phase estimates ${pausedWord}` : phaseText(cs)}. About this phase`}
                  disabled={paused || !cs.phase}
                  onPress={() => cs.phase && setPhaseSheet(cs.phase)}
                  style={({ pressed }) => [styles.phaseChip, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}>
                  <View style={[styles.phaseDot, { backgroundColor: cs.phase ? HERO_COLORS[HERO_OF[cs.phase]][1] : palette.ink[300] }]} />
                  <AppText color={palette.green[900]} style={styles.phaseChipText} numberOfLines={3}>
                    {paused ? `Phase estimates ${pausedWord}` : phaseText(cs)}
                  </AppText>
                  {!paused && cs.phase ? <ChevronRight size={16} color={palette.green[900]} /> : null}
                </Pressable>
              </View>
            </View>
            {/* phase legend (this card's colours, estimated day ranges) */}
            {phaseRanges && !paused ? (
              <View style={[styles.legend, narrow && styles.legendGrid]} accessibilityRole="summary">
                {ORDER.map((p, i) => (
                  <View key={p} style={[styles.legendItem, narrow ? [styles.legendCell, i % 2 === 1 && styles.legendDivider] : [styles.legendFlex, i > 0 && styles.legendDivider]]}>
                    <View style={[styles.legendDot, { backgroundColor: HERO_COLORS[HERO_OF[p]][1] }]} />
                    <View style={{ flexShrink: 1 }}>
                      <AppText style={styles.legendName} numberOfLines={1}>
                        {LEGEND_NAME[p]}
                      </AppText>
                      <AppText style={styles.legendDays} numberOfLines={1}>
                        {`${phaseRanges[p]}${p === 'menstrual' ? '' : '*'}`}
                      </AppText>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.heroStats}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Average cycle ${cs.avgCycleLength ? `${cs.avgCycleLength} days, estimate` : 'unknown'}. Open cycle history`} onPress={() => router.push('/cycle-history')} style={({ pressed }) => [styles.glass, narrow && styles.glassSm, pressed && styles.glassPressed]}>
                <View style={[styles.glassIcon, narrow && styles.glassIconSm]}>
                  <CalendarDays size={17} color="#fff" />
                </View>
                {narrow ? null : <View style={styles.glassRule} />}
                <View style={{ flex: 1 }}>
                  <AppText variant="overline" color={onDark.green[200]} style={{ fontSize: 9 }} numberOfLines={1}>
                    Avg cycle
                  </AppText>
                  <AppText style={styles.glassValue} numberOfLines={1}>{cs.avgCycleLength ? `${cs.avgCycleLength} days*` : '—'}</AppText>
                </View>
                <ChevronRight size={16} color={onDark.green[100]} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Average period ${cs.avgPeriodLength ? `${cs.avgPeriodLength} days, estimate` : 'unknown'}. Open cycle settings`} onPress={() => router.push('/cycle-settings')} style={({ pressed }) => [styles.glass, narrow && styles.glassSm, pressed && styles.glassPressed]}>
                <View style={[styles.glassIcon, narrow && styles.glassIconSm]}>
                  <Droplet size={17} color="#fff" />
                </View>
                {narrow ? null : <View style={styles.glassRule} />}
                <View style={{ flex: 1 }}>
                  <AppText variant="overline" color={onDark.green[200]} style={{ fontSize: 9 }} numberOfLines={1}>
                    Avg period
                  </AppText>
                  <AppText style={styles.glassValue} numberOfLines={1}>{cs.avgPeriodLength ? `${cs.avgPeriodLength} days*` : '—'}</AppText>
                </View>
                <ChevronRight size={16} color={onDark.green[100]} />
              </Pressable>
            </View>
            <View style={styles.heroActions}>
              <Button label={openPeriod ? 'End period' : 'Log Period'} icon={Plus} variant="rose" style={{ flex: 1.3 }} onPress={() => router.push('/log-period')} />
              <Button label="History" variant="light" icon={History} style={{ flex: 1 }} onPress={() => router.push('/cycle-history')} />
            </View>
          </View>

          {/* Range calendar (Mira) */}
          <SectionHeader eyebrow="Tap a day to see or edit it" title="Calendar" action="Full view" onAction={() => router.push('/calendar')} />
          <Card>
            <MonthCalendar month={month} onMonthChange={setMonth} periods={state.periods} state={cs} showEstimates={!paused} onSelect={(d) => router.push({ pathname: '/day/[date]', params: { date: d } })} />
            <Legend
              items={[
                { color: palette.rose[500], label: 'Logged' },
                { color: palette.rose[300], label: 'Predicted*', dashed: true },
                { color: fertile[300], label: 'Fertile window*' },
                { color: palette.green[700], label: 'Today', dashed: false },
              ]}
            />
          </Card>
          <EstimateNote compact style={{ marginTop: 10 }} text="Estimate based on the information you’ve provided — not a confirmation of ovulation." />
          <View style={styles.basisRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="smallMedium">{paused ? `Estimates ${pausedWord}` : basis.label}</AppText>
              <AppText variant="caption" muted>
                {basis.detail} {cs.isRegular === null ? 'Regularity not known yet.' : cs.isRegular ? 'Lengths look fairly consistent.' : 'Lengths vary.'}
              </AppText>
            </View>
            <Button label="Cycle settings" icon={Settings2} variant="ghost" size="sm" onPress={() => router.push('/cycle-settings')} />
          </View>

          {cs.isRegular === false ? <Disclaimer tone="rose" title="Observed pattern" style={{ marginTop: 12 }} text={`${COPY.irregular} ${COPY.concern}`} /> : null}
          {cs.isLate && !paused ? <Disclaimer tone="lavender" style={{ marginTop: 12 }} text={`Your estimated start date (${formatDate(cs.nextPeriodStart!, 'short')}) has passed. Cycles naturally vary — log your period when it starts. ${COPY.concern}`} /> : null}

          {/* Phases */}
          <SectionHeader eyebrow="Estimated for this cycle" title="Cycle phases" />
          <View style={styles.phaseGrid}>
            {ORDER.map((p) => {
              const active = cs.phase === p;
              return (
                <Pressable
                  key={p}
                  accessibilityRole="button"
                  accessibilityLabel={`${PHASES[p].label}${active ? ', current phase' : ''}`}
                  onPress={() => setPhaseSheet(p)}
                  style={({ pressed }) => [styles.phaseTile, { backgroundColor: phaseColors[p].soft }, active && { borderColor: phaseColors[p].solid, borderWidth: 2 }, pressed && { transform: [{ scale: 0.98 }] }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={[styles.phaseDisc, { borderColor: phaseColors[p].solid }]}>
                      <View style={[styles.phaseDot, { backgroundColor: phaseColors[p].solid, width: 10, height: 10, borderRadius: 5 }]} />
                    </View>
                    {active ? (
                      <View style={[styles.now, { backgroundColor: phaseColors[p].solid }]}>
                        <AppText variant="overline" color="#fff" style={{ fontSize: 9 }}>
                          Now
                        </AppText>
                      </View>
                    ) : (
                      <ChevronRight size={16} color={palette.ink[500]} />
                    )}
                  </View>
                  <AppText style={styles.phaseName}>{PHASES[p].short}</AppText>
                  <AppText variant="caption" color={palette.ink[600]}>
                    {phaseRanges ? `${phaseRanges[p]}${p === 'menstrual' ? '' : '*'}` : 'After a few cycles'}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {/* Quick links (Myflo tiles) */}
          <SectionHeader eyebrow="Explore" title="Track & understand" />
          <View style={styles.tiles}>
            <QuickTile tone="rose" icon={CalendarDays} label="Calendar" hint="Edit any day" onPress={() => router.push('/calendar')} style={styles.tile} />
            <QuickTile tone="green" icon={History} label="History" hint="Lengths & trends" onPress={() => router.push('/cycle-history')} style={styles.tile} />
            <QuickTile tone="peach" icon={Stethoscope} label="Symptoms" hint="How you feel" onPress={() => router.push('/symptoms')} style={styles.tile} />
            <QuickTile tone="lavender" icon={Smile} label="Mood" hint="Stress & energy" onPress={() => router.push('/mood')} style={styles.tile} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Fertility awareness" onPress={() => router.push('/fertility')} style={({ pressed }) => [styles.fertility, pressed && { opacity: 0.94 }]}>
            <Photo photo="woman-tea" style={styles.fertilityPhoto} radius={18} position="top" />
            <View style={{ flex: 1, gap: 4 }}>
              <PhaseBadge phase={3} />
              <AppText variant="h3" style={{ fontFamily: font.display, fontSize: 16.5 }}>
                Fertility awareness
              </AppText>
              <AppText variant="caption" muted>
                BBT, cervical mucus & test logs — estimates only, never contraception.
              </AppText>
            </View>
            <View style={styles.fertilityIcon}>
              <Flower2 size={18} color={palette.lavender[600]} />
            </View>
          </Pressable>

          {/* Media */}
          <SectionHeader eyebrow="Feel-good for any phase" title="Comfort & movement" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4, paddingHorizontal: 2 }}>
            <VideoCard video="yoga-flow" width={230} height={170} />
            <VideoCard video="breathing" width={230} height={170} />
            {comfort ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Article: ${comfort.title}`} onPress={() => router.push({ pathname: '/learn/[id]', params: { id: comfort.id } })} style={({ pressed }) => [{ width: 230 }, pressed && { transform: [{ scale: 0.98 }] }]}>
                <Photo photo="period-comfort" style={styles.comfort} radius={24}>
                  <LinearGradient colors={['rgba(8,45,36,0)', 'rgba(8,45,36,0.2)', 'rgba(8,45,36,0.85)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.comfortChip}>
                    <AppText variant="caption" color={palette.rose[700]} style={{ fontFamily: font.semibold }}>
                      Article · {comfort.readMin} min
                    </AppText>
                  </View>
                  <View style={styles.comfortText}>
                    <AppText variant="h3" color="#fff" numberOfLines={2} style={{ fontFamily: font.display, fontSize: 16 }}>
                      {comfort.title}
                    </AppText>
                    <AppText variant="small" color="rgba(255,255,255,0.8)">
                      Cycle care
                    </AppText>
                  </View>
                </Photo>
              </Pressable>
            ) : null}
          </ScrollView>

          {/* Recent periods */}
          <SectionHeader eyebrow="Logged" title="Recent periods" action="History" onAction={() => router.push('/cycle-history')} />
          <Card padded={false} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
            {recent.map((p, i) => {
              const len = p.end ? diffDays(p.start, p.end) + 1 : diffDays(p.start, state.today) + 1;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit period from ${formatDate(p.start, 'long')}`}
                  onPress={() => router.push({ pathname: '/log-period', params: { id: p.id } })}
                  style={({ pressed }) => [styles.periodRow, i < recent.length - 1 && styles.border, pressed && { backgroundColor: palette.rose[50] }]}>
                  <View style={styles.dateDisc}>
                    <AppText style={styles.dateNum}>{Number(p.start.slice(8))}</AppText>
                    <AppText variant="overline" color={palette.rose[700]} style={{ fontSize: 8.5, lineHeight: 10 }}>
                      {formatDate(p.start, 'short').replace(/[\d\s,]/g, '')}
                    </AppText>
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <AppText variant="bodyMedium">
                      {formatDate(p.start, 'medium')}
                      {p.end ? ` – ${formatDate(p.end, 'short')}` : ' · ongoing'}
                    </AppText>
                    <View style={styles.dropRow}>
                      {Array.from({ length: Math.min(len, 8) }, (_, k) => (
                        <Droplet key={k} size={11} color={palette.rose[500]} fill={k < 2 ? palette.rose[400] : palette.rose[200]} />
                      ))}
                      <AppText variant="caption" muted style={{ marginLeft: 4 }}>
                        {p.end ? `${len} days` : `Day ${len}`}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.editDisc}>
                    <Pencil size={14} color={palette.ink[600]} />
                  </View>
                </Pressable>
              );
            })}
          </Card>

          <Card tone="mint" style={{ marginTop: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={styles.careIcon}>
              <Stethoscope size={18} color={palette.green[700]} />
            </View>
            <AppText variant="small" color={brandText} style={{ flex: 1 }}>
              {COPY.concern}
            </AppText>
          </Card>
        </>
      )}

      <Sheet
        visible={!!phaseSheet}
        onClose={() => setPhaseSheet(null)}
        eyebrow={phaseSheet && cs.phase === phaseSheet ? 'Your current phase' : 'Cycle phase'}
        title={phaseSheet ? PHASES[phaseSheet].label : ''}
        subtitle={phaseSheet && phaseRanges ? `${phaseRanges[phaseSheet]} of your current cycle` : undefined}>
        {phaseSheet ? (
          <View style={{ gap: 14 }}>
            <View style={[styles.sheetBand, { backgroundColor: phaseColors[phaseSheet].soft }]}>
              <View style={[styles.phaseDot, { backgroundColor: phaseColors[phaseSheet].solid, width: 12, height: 12, borderRadius: 6 }]} />
              <AppText variant="body" style={{ flex: 1 }}>
                {PHASES[phaseSheet].description}
              </AppText>
            </View>
            <View style={{ gap: 8 }}>
              <AppText variant="overline" color={palette.green[700]}>
                Gentle ideas
              </AppText>
              {PHASES[phaseSheet].tips.map((t) => (
                <View key={t} style={styles.tip}>
                  <View style={[styles.phaseDot, { backgroundColor: phaseColors[phaseSheet].solid, width: 8, height: 8 }]} />
                  <AppText variant="small" style={{ flex: 1 }}>
                    {t}
                  </AppText>
                </View>
              ))}
            </View>
            {phaseSheet !== 'menstrual' ? <EstimateNote text={`${COPY.estimate} ${COPY.ovulationNotConfirmed}`} /> : null}
            <ArticleCard article={state.articles.find((a) => a.id === 'a_cycle_phases') ?? state.articles[0]} wide />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  basisRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  hero: { borderRadius: 30, padding: 18, overflow: 'hidden', ...shadow.lift },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroBig: { fontFamily: font.displayBold, fontSize: 34, lineHeight: 40, letterSpacing: -0.8, color: '#fff' },
  // Light pill on the forest hero in both modes; opens the current phase sheet.
  phaseChip: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: onDark.green[100], borderRadius: 999, paddingLeft: 11, paddingRight: 9, paddingVertical: 7, maxWidth: '100%', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  phaseChipText: { fontFamily: font.semibold, fontSize: 13, lineHeight: 17, flexShrink: 1 },
  phaseDot: { width: 10, height: 10, borderRadius: 5 },
  legend: { flexDirection: 'row', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 5, minWidth: 0 },
  legendFlex: { flex: 1 },
  legendDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.14)' },
  legendGrid: { flexWrap: 'wrap', rowGap: 10, paddingHorizontal: 6 },
  legendCell: { width: '50%', paddingHorizontal: 8 },
  legendDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)' },
  legendName: { fontFamily: font.semibold, fontSize: 11.5, lineHeight: 15, color: '#fff' },
  legendDays: { fontFamily: font.regular, fontSize: 10, lineHeight: 13, color: 'rgba(255,255,255,0.72)' },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 12 },
  glass: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 18, paddingLeft: 9, paddingRight: 8, paddingVertical: 9 },
  glassSm: { gap: 7, paddingLeft: 8, paddingRight: 6 },
  glassIconSm: { width: 28, height: 28, borderRadius: 14 },
  glassPressed: { backgroundColor: 'rgba(255,255,255,0.16)', transform: [{ scale: 0.98 }] },
  glassIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  glassRule: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.16)' },
  glassValue: { fontFamily: font.display, fontSize: 16, lineHeight: 21, color: '#fff', marginTop: 1 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  phaseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  phaseTile: { width: '47%', flexGrow: 1, borderRadius: 22, padding: 14, gap: 4, borderWidth: 2, borderColor: 'transparent', minHeight: 112 },
  phaseDisc: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  now: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  phaseName: { fontFamily: font.display, fontSize: 17, lineHeight: 22, color: colors.text, marginTop: 8 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '47%', flexGrow: 1, minHeight: 104 },
  fertility: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, backgroundColor: palette.lavender[50], borderWidth: 1, borderColor: palette.lavender[100], borderRadius: 22, padding: 10, paddingRight: 14 },
  fertilityPhoto: { width: 76, height: 86 },
  fertilityIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  comfort: { width: '100%', height: 170, ...shadow.card },
  comfortChip: { position: 'absolute', top: 12, left: 12, backgroundColor: colors.surface, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  comfortText: { position: 'absolute', left: 14, right: 14, bottom: 12 },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderRadius: 14 },
  border: { borderBottomWidth: 1, borderBottomColor: palette.ink[100] },
  dateDisc: { width: 48, height: 48, borderRadius: 16, backgroundColor: palette.rose[50], borderWidth: 1, borderColor: palette.rose[100], alignItems: 'center', justifyContent: 'center' },
  dateNum: { fontFamily: font.displayBold, fontSize: 17, lineHeight: 19, color: palette.rose[700] },
  dropRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  editDisc: { width: 34, height: 34, borderRadius: 17, backgroundColor: palette.ink[50], alignItems: 'center', justifyContent: 'center' },
  careIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  sheetBand: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 18, padding: 14 },
  tip: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: palette.ink[50], borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
});
