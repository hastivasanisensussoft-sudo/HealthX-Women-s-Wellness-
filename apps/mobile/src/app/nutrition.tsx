/** Nutrition (SRS §28) — Premium, Phase 2 module: photo hero with energy ring, macro rings, a meal timeline, meal ideas and a cooking video. General education only, no individualised treatment claims. */
import { NUTRITION_TARGETS, mealsOn, nutritionTotals, waterOn, type MealLog } from '@healthx/shared';
import { router } from 'expo-router';
import { Apple, ChefHat, ChevronRight, Coffee, Cookie, Droplets, Plus, Soup, Trash2, UtensilsCrossed } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackendNote, Disclaimer, PhaseBadge } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressRing } from '@/components/Charts';
import { EmptyState } from '@/components/Feedback';
import { Chip, TextField } from '@/components/Inputs';
import { PremiumGate, usePremium } from '@/components/PremiumGate';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { VideoCard } from '@/components/Video';
import { GroupHeader, PageIntro, PhotoPanel, TintIcon, type Tone, ON_DARK } from '@/components/b-kit';
import { useStore } from '@/lib/store';
import { colors, font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const MEAL_ICON = { breakfast: Coffee, lunch: Soup, dinner: UtensilsCrossed, snack: Cookie } as const;
const MEAL_TONE: Record<MealLog['meal'], Tone> = { breakfast: 'butter', lunch: 'green', snack: 'rose', dinner: 'lavender' };
const MEALS = ['breakfast', 'lunch', 'snack', 'dinner'] as const;

export default function Nutrition() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const premium = usePremium();
  const meals = mealsOn(state, state.today);
  const t = nutritionTotals(state, state.today);
  const water = waterOn(state, state.today);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ meal: 'snack' as MealLog['meal'], name: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const macros = [
    { key: 'protein', label: 'Protein', v: t.protein, target: NUTRITION_TARGETS.protein, color: palette.green[500], track: palette.green[100] },
    { key: 'carbs', label: 'Carbs', v: t.carbs, target: NUTRITION_TARGETS.carbs, color: palette.butter[500], track: palette.butter[100] },
    { key: 'fat', label: 'Fat', v: t.fat, target: NUTRITION_TARGETS.fat, color: palette.peach[400], track: palette.peach[100] },
    { key: 'fiber', label: 'Fibre', v: t.fiber, target: NUTRITION_TARGETS.fiber, color: palette.lavender[400], track: palette.lavender[100] },
  ];

  const save = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'Add a short meal name.';
    const nums = ['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const;
    nums.forEach((k) => {
      const v = Number(form[k] || 0);
      if (Number.isNaN(v) || v < 0) e[k] = 'Must be 0 or more.';
    });
    if (Number(form.kcal) > 3000) e.kcal = 'That seems high for one meal — please check.';
    setErrors(e);
    if (Object.keys(e).length) return;
    dispatch({
      type: 'ADD_MEAL',
      meal: {
        date: state.today,
        meal: form.meal,
        name: form.name.trim(),
        kcal: Number(form.kcal || 0),
        protein: Number(form.protein || 0),
        carbs: Number(form.carbs || 0),
        fat: Number(form.fat || 0),
        fiber: Number(form.fiber || 0),
      },
    });
    toast(`Logged ${form.meal}`);
    setOpen(false);
    setForm({ meal: 'snack', name: '', kcal: '', protein: '', carbs: '', fat: '', fiber: '' });
  };

  return (
    <Screen back right={<PhaseBadge phase={2} />} footer={premium ? <Button label="Add meal" icon={Plus} full onPress={() => setOpen(true)} /> : undefined}>
      <PageIntro eyebrow="Nourish · today" title="Nutrition" subtitle="Log meals loosely — estimates are fine." />

      <PremiumGate
        feature="nutrition"
        preview={
          <Card tone="peach" style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TintIcon icon={UtensilsCrossed} tone="peach" size={40} solid />
              <View style={{ flex: 1 }}>
                <AppText variant="h3">Your meals, at a glance</AppText>
                <AppText variant="small" muted>
                  Log meals loosely, see macro rings for the day, and get simple meal ideas, a 3-day plan and a grocery list.
                </AppText>
              </View>
            </View>
          </Card>
        }>
        <PhotoPanel photo="nutrition-bowl" height={196}>
          <View style={styles.heroRow}>
            <ProgressRing value={t.kcal / NUTRITION_TARGETS.kcal} size={108} stroke={10} color={palette.butter[400]} track="rgba(255,255,255,0.25)">
              <AppText style={styles.kcal}>{t.kcal}</AppText>
              <AppText variant="caption" color={ON_DARK.text}>
                kcal
              </AppText>
            </ProgressRing>
            <View style={{ flex: 1 }}>
              <AppText variant="overline" color={palette.butter[400]}>
                Today
              </AppText>
              <AppText variant="h2" color="#fff">
                {meals.length} meal{meals.length === 1 ? '' : 's'} logged
              </AppText>
              <AppText variant="small" color={ON_DARK.text}>
                Water {(water / 1000).toFixed(1)} L · reference {NUTRITION_TARGETS.kcal} kcal
              </AppText>
            </View>
          </View>
        </PhotoPanel>

        {/* Macro rings */}
        <View style={styles.macros}>
          {macros.map((m) => (
            <View key={m.key} style={styles.macro} accessible accessibilityLabel={`${m.label}: ${m.v} of ${m.target} grams`}>
              <ProgressRing value={m.v / m.target} size={62} stroke={7} color={m.color} track={m.track}>
                <AppText variant="smallMedium">{m.v}</AppText>
              </ProgressRing>
              <AppText variant="smallMedium" style={{ marginTop: 6 }}>
                {m.label}
              </AppText>
              <AppText variant="caption" muted>
                of {m.target} g
              </AppText>
            </View>
          ))}
        </View>
        <Pressable accessibilityRole="link" onPress={() => router.push('/hydration')} style={({ pressed }) => [styles.water, pressed && { opacity: 0.9 }]}>
          <TintIcon icon={Droplets} tone="sky" size={36} solid />
          <AppText variant="bodyMedium" style={{ flex: 1 }}>
            Water
          </AppText>
          <AppText variant="smallMedium" color={palette.sky[700]}>
            {(water / 1000).toFixed(2)} L → hydration
          </AppText>
          <ChevronRight size={16} color={palette.sky[700]} />
        </Pressable>
        <Disclaimer style={{ marginTop: 12 }} text="Reference values are general, not personalised targets. For individual dietary advice, speak with a registered dietitian or healthcare professional." />
        <Pressable accessibilityRole="link" accessibilityLabel="Meal ideas & grocery list" onPress={() => router.push('/meal-ideas')} style={({ pressed }) => [styles.ideas, pressed && { opacity: 0.9 }]}>
          <TintIcon icon={ChefHat} tone="peach" size={40} solid />
          <View style={{ flex: 1 }}>
            <AppText variant="h3">Meal ideas & grocery list</AppText>
            <AppText variant="caption" muted>
              Simple recipes, a 3-day plan and a shopping list
            </AppText>
          </View>
          <ChevronRight size={18} color={palette.peach[700]} />
        </Pressable>

        {/* Meal timeline */}
        <GroupHeader eyebrow={`${t.kcal} kcal so far`} title="Meals today" />
        {meals.length === 0 ? (
          <Card tone="peach" style={{ marginBottom: 12 }}>
            <EmptyState icon={Apple} title="No meals yet today" text="Add what you ate — estimates are fine." />
          </Card>
        ) : null}
        <View>
          {MEALS.map((slot, si) => {
            const list = meals.filter((m) => m.meal === slot);
            const Icon = MEAL_ICON[slot];
            const kcal = list.reduce((a, m) => a + m.kcal, 0);
            return (
              <View key={slot} style={styles.slot}>
                <View style={styles.rail}>
                  <TintIcon icon={Icon} tone={MEAL_TONE[slot]} size={40} />
                  {si < MEALS.length - 1 ? <View style={styles.line} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: 18 }}>
                  <View style={styles.slotHead}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="h3" style={{ textTransform: 'capitalize' }}>
                        {slot}
                      </AppText>
                      <AppText variant="caption" muted>
                        {list.length ? `${kcal} kcal · ${list.length} item${list.length === 1 ? '' : 's'}` : 'Nothing logged'}
                      </AppText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${slot}`}
                      onPress={() => {
                        setForm({ ...form, meal: slot });
                        setOpen(true);
                      }}
                      hitSlop={6}
                      style={styles.add}>
                      <Plus size={18} color={palette.green[700]} />
                    </Pressable>
                  </View>
                  {list.map((m) => (
                    <View key={m.id} style={styles.meal}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="bodyMedium">{m.name}</AppText>
                        <View style={styles.chips}>
                          <Macro label={`${m.kcal} kcal`} strong />
                          <Macro label={`P ${m.protein}g`} />
                          <Macro label={`C ${m.carbs}g`} />
                          <Macro label={`F ${m.fat}g`} />
                          <Macro label={`Fibre ${m.fiber}g`} />
                        </View>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${m.name}`}
                        onPress={() => {
                          dispatch({ type: 'REMOVE_MEAL', id: m.id });
                          toast('Meal removed', 'info');
                        }}
                        hitSlop={8}
                        style={styles.del}>
                        <Trash2 size={15} color={palette.ink[500]} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        <GroupHeader eyebrow="Video preview" title="Cook something colourful" />
        <VideoCard video="healthy-cooking" width="100%" height={188} />
      </PremiumGate>
      <BackendNote style={{ marginTop: 14 }} text="Food database search (incl. Indian foods) is a future feature (SRS §28, D-35). Meal ideas, the 3-day plan and the grocery list are a preview: general ideas without nutrient numbers." />

      <Sheet visible={open} onClose={() => setOpen(false)} title="Add a meal" footer={<Button label="Save meal" full onPress={save} />}>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MEALS.map((m) => (
              <Chip key={m} label={m[0].toUpperCase() + m.slice(1)} tone="peach" selected={form.meal === m} onPress={() => setForm({ ...form, meal: m })} />
            ))}
          </View>
          <TextField label="What did you eat?" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} error={errors.name} placeholder="e.g. Dal & rice" maxLength={60} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextField label="kcal" value={form.kcal} onChangeText={(v) => setForm({ ...form, kcal: v.replace(/[^\d.]/g, '') })} keyboardType="decimal-pad" error={errors.kcal} style={{ flex: 1 }} />
            <TextField label="Protein g" value={form.protein} onChangeText={(v) => setForm({ ...form, protein: v.replace(/[^\d.]/g, '') })} keyboardType="decimal-pad" error={errors.protein} style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextField label="Carbs g" value={form.carbs} onChangeText={(v) => setForm({ ...form, carbs: v.replace(/[^\d.]/g, '') })} keyboardType="decimal-pad" style={{ flex: 1 }} />
            <TextField label="Fat g" value={form.fat} onChangeText={(v) => setForm({ ...form, fat: v.replace(/[^\d.]/g, '') })} keyboardType="decimal-pad" style={{ flex: 1 }} />
            <TextField label="Fibre g" value={form.fiber} onChangeText={(v) => setForm({ ...form, fiber: v.replace(/[^\d.]/g, '') })} keyboardType="decimal-pad" style={{ flex: 1 }} />
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}

function Macro({ label, strong }: { label: string; strong?: boolean }) {
  return (
    <View style={[styles.macroChip, strong && { backgroundColor: palette.peach[50], borderColor: palette.peach[100] }]}>
      <AppText variant="caption" color={strong ? palette.peach[700] : colors.textMuted} style={strong ? { fontFamily: font.semibold } : undefined}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  kcal: { fontFamily: font.displayBold, fontSize: 26, lineHeight: 30, color: '#fff' },
  macros: { flexDirection: 'row', marginTop: 14, backgroundColor: colors.surface, borderRadius: 24, paddingVertical: 16, paddingHorizontal: 6, borderWidth: 1, borderColor: palette.ink[100] },
  macro: { flex: 1, alignItems: 'center' },
  water: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, padding: 12, borderRadius: 20, backgroundColor: palette.sky[50], borderWidth: 1, borderColor: palette.sky[100] },
  ideas: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 14, borderRadius: 22, backgroundColor: palette.peach[50], borderWidth: 1, borderColor: palette.peach[100] },
  slot: { flexDirection: 'row', gap: 12 },
  rail: { width: 40, alignItems: 'center' },
  line: { flex: 1, width: 2, backgroundColor: palette.ink[100], marginVertical: 4 },
  slotHead: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  add: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.green[50], borderWidth: 1, borderColor: palette.green[100], alignItems: 'center', justifyContent: 'center' },
  meal: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10, padding: 12, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  macroChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: palette.ink[50], borderWidth: 1, borderColor: palette.ink[100] },
  del: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
