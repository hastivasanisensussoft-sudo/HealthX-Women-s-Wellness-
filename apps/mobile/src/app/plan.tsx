/** Daily wellness plan (SRS §33) — rules-based checklist with a progress hero; AI personalisation is Phase 3 (§35). */
import { checkInOn, formatDate } from '@healthx/shared';
import { router } from 'expo-router';
import { Check, ChevronRight, ListChecks, RefreshCw } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { MoodFace } from '@/components/Art';
import { PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressBar, ProgressRing } from '@/components/Charts';
import { EmptyState } from '@/components/Feedback';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { GroupHeader, HeroPanel, PageIntro, ON_DARK } from '@/components/b-kit';
import { KeyIcon } from '@/lib/icons';
import { useStore } from '@/lib/store';
import { colors, font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

export default function Plan() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const items = state.plan.items;
  const done = items.filter((i) => i.done).length;
  const ci = checkInOn(state, state.today);
  const allDone = done === items.length && items.length > 0;

  return (
    <Screen back right={<PhaseBadge phase={2} />}>
      <PageIntro eyebrow={formatDate(state.today, 'long')} title="Today’s plan" subtitle="A short, gentle checklist for today." />

      <HeroPanel>
        <View style={styles.heroRow}>
          <ProgressRing value={items.length ? done / items.length : 0} size={96} stroke={10} color={palette.butter[400]} track="rgba(255,255,255,0.14)">
            <AppText style={styles.num}>
              {done}/{items.length}
            </AppText>
          </ProgressRing>
          <View style={{ flex: 1 }}>
            <AppText variant="overline" color={ON_DARK.soft}>
              {allDone ? 'Complete' : 'In progress'}
            </AppText>
            <AppText variant="title" color="#fff">
              {allDone ? 'All done — lovely!' : 'Small steps add up'}
            </AppText>
            <AppText variant="small" color={ON_DARK.text} style={{ marginTop: 4 }}>
              {ci ? 'Built from your check-in, goals and habits.' : 'Check in to tailor today’s plan to how you feel.'}
            </AppText>
          </View>
        </View>
        <ProgressBar value={items.length ? done / items.length : 0} color={palette.butter[400]} track="rgba(255,255,255,0.14)" height={8} style={{ marginTop: 16 }} />
      </HeroPanel>

      {!ci ? (
        <Card tone="lavender" style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={() => router.push('/check-in')} accessibilityLabel="Check in">
          <MoodFace mood="neutral" size={42} />
          <View style={{ flex: 1 }}>
            <AppText variant="h3">Check in first</AppText>
            <AppText variant="caption" color={palette.lavender[700]}>
              Under 30 seconds
            </AppText>
          </View>
          <ChevronRight size={18} color={palette.lavender[700]} />
        </Card>
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
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  num: { fontFamily: font.displayBold, fontSize: 24, lineHeight: 28, color: '#fff' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 22, padding: 16, borderWidth: 1.5, borderColor: colors.borderSoft },
  itemDone: { backgroundColor: palette.green[50], borderColor: palette.green[100] },
  idx: { width: 24, fontFamily: font.monoMedium, fontSize: 13 },
  box: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: palette.green[300], alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: palette.green[700], borderColor: palette.green[700] },
});
