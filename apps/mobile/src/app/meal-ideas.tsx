/**
 * Meal ideas, simple recipes, a 3-day plan and a grocery list (SRS §28 "potential future features") —
 * a Premium preview. General food ideas only: there is no food database yet, so no calorie or nutrient
 * numbers and no individual dietary advice. The grocery list stays on this phone (deviceData.ts).
 */
import { MEAL_DISCLAIMER, MEAL_IDEAS, buildMealPlan, groceryList, mealIdeasFor, type Cuisine, type GroceryAisle, type GroceryItem, type MealIdea, type MealSlot } from '@healthx/shared';
import { Carrot, Check, ChevronRight, Coffee, Cookie, CookingPot, Egg, Eraser, Fish, Salad, ShoppingBasket, Smartphone, Soup, Sparkles, UtensilsCrossed, Wheat, X, type LucideIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackendNote, Disclaimer, PhaseBadge, Pill } from '@/components/Badges';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState, SkeletonCard } from '@/components/Feedback';
import { CheckBox, Chip, Segmented, ToggleRow } from '@/components/Inputs';
import { PremiumGate } from '@/components/PremiumGate';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { AppText } from '@/components/Text';
import { GlassTag, PageIntro, PhotoPanel, TintIcon, type Tone, ON_DARK } from '@/components/b-kit';
import { DEVICE_ONLY_NOTE } from '@/lib/deviceData';
import { useDeviceData } from '@/lib/useDeviceData';
import { colors, font, palette } from '@/lib/theme';
import { useToast } from '@/lib/toast';

type Tab = 'ideas' | 'plan' | 'grocery';
/** Phone-only grocery list: the chosen meal ideas and the ticked items (short keys keep it small). */
interface Grocery {
  ideas: string[];
  checked: string[];
}
const EMPTY: Grocery = { ideas: [], checked: [] };
const MAX_IDEAS = 12;
const NONE: string[] = [];
/** Phone storage can hold an older or partial value — read it defensively. */
const norm = (g: Partial<Grocery> | null | undefined): Grocery => ({
  ideas: Array.isArray(g?.ideas) ? g.ideas : NONE,
  checked: Array.isArray(g?.checked) ? g.checked : NONE,
});

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const SLOT_ICON: Record<MealSlot, LucideIcon> = { breakfast: Coffee, lunch: Soup, dinner: UtensilsCrossed, snack: Cookie };
const SLOT_TONE: Record<MealSlot, Tone> = { breakfast: 'butter', lunch: 'green', snack: 'rose', dinner: 'lavender' };
const AISLES: GroceryAisle[] = ['Produce', 'Grains & pulses', 'Dairy & eggs', 'Protein', 'Pantry & spices'];
const AISLE: Record<GroceryAisle, { icon: LucideIcon; tone: Tone }> = {
  Produce: { icon: Carrot, tone: 'green' },
  'Grains & pulses': { icon: Wheat, tone: 'butter' },
  'Dairy & eggs': { icon: Egg, tone: 'sky' },
  Protein: { icon: Fish, tone: 'rose' },
  'Pantry & spices': { icon: CookingPot, tone: 'peach' },
};
const CUISINES: { key: Cuisine | 'any'; label: string }[] = [
  { key: 'any', label: 'Any cuisine' },
  { key: 'indian', label: 'Indian' },
  { key: 'global', label: 'Global' },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Short stable key for a grocery item (FNV-1a), so the phone-only value stays small. */
function keyOf(item: string) {
  let h = 2166136261;
  for (const ch of item.toLowerCase()) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
const titleOf = (id: string) => MEAL_IDEAS.find((m) => m.id === id)?.title ?? id;

export default function MealIdeas() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('ideas');
  const [vegetarian, setVegetarian] = useState(false);
  const [cuisine, setCuisine] = useState<Cuisine | 'any'>('any');
  const [slot, setSlot] = useState<MealSlot | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const grocery = useDeviceData<Grocery>('grocery', EMPTY);
  const saved = norm(grocery.value);
  const chosen = saved.ideas;

  const ideas = useMemo(() => mealIdeasFor(slot, { vegetarian, cuisine }), [slot, vegetarian, cuisine]);
  const plan = useMemo(() => buildMealPlan({ vegetarian, cuisine }, 3), [vegetarian, cuisine]);
  const list = groceryList(chosen); // at most 12 meals — cheap
  const ticked = list.filter((i) => saved.checked.includes(keyOf(i.item))).length;
  const idea = openId ? (MEAL_IDEAS.find((m) => m.id === openId) ?? null) : null;

  const addIdeas = (ids: string[]) => {
    const fresh = [...new Set(ids)].filter((id) => !chosen.includes(id));
    if (!fresh.length) return toast('Already on your grocery list', 'info');
    const room = MAX_IDEAS - chosen.length;
    if (room <= 0) return toast(`Your list holds up to ${MAX_IDEAS} meals — remove some first`, 'info');
    const add = fresh.slice(0, room);
    grocery.set((prev) => {
      const g = norm(prev);
      return { ...g, ideas: [...g.ideas, ...add.filter((id) => !g.ideas.includes(id))] };
    });
    toast(add.length === 1 ? 'Added to your grocery list' : `Added ${add.length} meals to your grocery list${add.length < fresh.length ? ` (list full at ${MAX_IDEAS})` : ''}`);
  };

  const removeIdea = (id: string) => {
    grocery.set((prev) => {
      const g = norm(prev);
      const ideasLeft = g.ideas.filter((x) => x !== id);
      const keys = new Set(groceryList(ideasLeft).map((i) => keyOf(i.item)));
      return { ideas: ideasLeft, checked: g.checked.filter((k) => keys.has(k)) };
    });
    toast('Removed from your grocery list', 'info');
  };

  const toggleItem = (item: string) => {
    const k = keyOf(item);
    grocery.set((prev) => {
      const g = norm(prev);
      return { ...g, checked: g.checked.includes(k) ? g.checked.filter((x) => x !== k) : [...g.checked, k] };
    });
  };

  const clear = () => {
    grocery.set(EMPTY);
    toast('Grocery list cleared', 'info');
  };

  const filters = (
    <Card style={{ marginTop: 16, gap: 12 }}>
      <ToggleRow title="Vegetarian only" subtitle="Hides meals with meat, fish or eggs" value={vegetarian} onChange={setVegetarian} last />
      <View style={styles.chips}>
        {CUISINES.map((c) => (
          <Chip key={c.key} label={c.label} selected={cuisine === c.key} onPress={() => setCuisine(c.key)} />
        ))}
      </View>
    </Card>
  );

  return (
    <Screen back right={<PhaseBadge phase={2} />}>
      <PageIntro eyebrow="Nourish · ideas" title="Meal ideas" subtitle="Simple, balanced ideas, a 3-day plan and a grocery list." />

      <PhotoPanel photo="healthy-food" height={168} alt="A colourful bowl of grains and vegetables">
        <GlassTag label="Preview" icon={<Sparkles size={12} color={palette.green[800]} />} />
        <AppText variant="h2" color="#fff" style={{ marginTop: 'auto' }}>
          {MEAL_IDEAS.length} everyday meal ideas
        </AppText>
        <AppText variant="small" color={ON_DARK.text}>
          Indian and global · vegetarian options · no calorie counting
        </AppText>
      </PhotoPanel>

      <PremiumGate feature="nutrition" preview={<View style={{ height: 14 }} />}>
        <Segmented
          value={tab}
          onChange={setTab}
          style={{ marginTop: 16 }}
          options={[
            { key: 'ideas', label: 'Ideas' },
            { key: 'plan', label: '3-day plan' },
            { key: 'grocery', label: 'Grocery list' },
          ]}
        />

        {tab === 'ideas' ? (
          <>
            {filters}
            <View style={[styles.chips, { marginTop: 14 }]}>
              {(['all', ...SLOTS] as const).map((s) => (
                <Chip key={s} label={s === 'all' ? 'All meals' : cap(s)} tone="peach" selected={slot === s} onPress={() => setSlot(s)} />
              ))}
            </View>
            <AppText variant="overline" color={palette.green[700]} style={{ marginTop: 16 }}>
              {ideas.length} idea{ideas.length === 1 ? '' : 's'}
            </AppText>
            {ideas.length ? (
              ideas.map((m) => <IdeaCard key={m.id} idea={m} added={chosen.includes(m.id)} onPress={() => setOpenId(m.id)} />)
            ) : (
              <Card tone="peach" style={{ marginTop: 10 }}>
                <EmptyState icon={Salad} title="No ideas match" text="Try another cuisine or meal." />
              </Card>
            )}
          </>
        ) : tab === 'plan' ? (
          <>
            {filters}
            <AppText variant="small" muted style={{ marginTop: 14 }}>
              One idea for each meal, varied across three days. Tap a meal for the recipe.
            </AppText>
            {plan.map((d) => (
              <Card key={d.day} style={{ marginTop: 12 }}>
                <View style={styles.dayHead}>
                  <AppText variant="h3" style={{ flex: 1 }}>
                    Day {d.day}
                  </AppText>
                  <Button
                    label="Add to list"
                    icon={ShoppingBasket}
                    size="sm"
                    variant="soft"
                    onPress={() => addIdeas(SLOTS.map((s) => d.meals[s]?.id).filter((x): x is string => !!x))}
                    accessibilityHint={`Adds the day ${d.day} meals to your grocery list`}
                  />
                </View>
                {SLOTS.map((s, i) => {
                  const m = d.meals[s];
                  return (
                    <Pressable
                      key={s}
                      accessibilityRole={m ? 'button' : undefined}
                      accessibilityLabel={m ? `${cap(s)}: ${m.title}. Open recipe` : `${cap(s)}: no idea matches these filters`}
                      disabled={!m}
                      onPress={() => m && setOpenId(m.id)}
                      style={({ pressed }) => [styles.planRow, i < SLOTS.length - 1 && styles.border, pressed && { opacity: 0.85 }]}>
                      <TintIcon icon={SLOT_ICON[s]} tone={SLOT_TONE[s]} size={36} />
                      <View style={{ flex: 1 }}>
                        <AppText variant="caption" muted>
                          {cap(s)}
                        </AppText>
                        <AppText variant="bodyMedium">{m ? m.title : 'No idea matches these filters'}</AppText>
                      </View>
                      {m ? <ChevronRight size={16} color={colors.textSubtle} /> : null}
                    </Pressable>
                  );
                })}
              </Card>
            ))}
            <Button
              label="Add the whole plan to my grocery list"
              icon={ShoppingBasket}
              variant="secondary"
              full
              style={{ marginTop: 14 }}
              onPress={() => addIdeas(plan.flatMap((d) => SLOTS.map((s) => d.meals[s]?.id).filter((x): x is string => !!x)))}
            />
          </>
        ) : !grocery.ready ? (
          <View style={{ marginTop: 16 }}>
            <SkeletonCard />
          </View>
        ) : list.length === 0 ? (
          <Card tone="mint" style={{ marginTop: 16 }}>
            <EmptyState icon={ShoppingBasket} title="Your grocery list is empty" text="Open a meal idea and tap “Add to grocery list”." action="Browse ideas" onAction={() => setTab('ideas')} />
          </Card>
        ) : (
          <>
            <View style={styles.listHead}>
              <AppText variant="overline" color={palette.green[700]} style={{ flex: 1 }}>
                {ticked}/{list.length} ticked · {chosen.length} meal{chosen.length === 1 ? '' : 's'}
              </AppText>
              <Button label="Clear list" icon={Eraser} size="sm" variant="ghost" onPress={clear} />
            </View>
            <View style={styles.chips}>
              {chosen.map((id) => (
                <Pressable key={id} accessibilityRole="button" accessibilityLabel={`Remove ${titleOf(id)} from the grocery list`} onPress={() => removeIdea(id)} hitSlop={4} style={({ pressed }) => [styles.mealTag, pressed && { opacity: 0.85 }]}>
                  <AppText variant="caption" color={palette.ink[800]} style={{ fontFamily: font.semibold }} numberOfLines={1}>
                    {titleOf(id)}
                  </AppText>
                  <X size={12} color={palette.ink[500]} />
                </Pressable>
              ))}
            </View>
            {AISLES.map((a) => {
              const items = list.filter((i) => i.aisle === a);
              if (!items.length) return null;
              return <AisleCard key={a} aisle={a} items={items} checked={saved.checked} onToggle={toggleItem} />;
            })}
          </>
        )}

        {tab === 'grocery' ? (
          <View style={styles.device}>
            <Smartphone size={14} color={palette.ink[500]} />
            <AppText variant="caption" muted style={{ flex: 1 }}>
              {DEVICE_ONLY_NOTE}
            </AppText>
          </View>
        ) : null}
      </PremiumGate>

      <Disclaimer style={{ marginTop: 16 }} text={MEAL_DISCLAIMER} />
      <BackendNote style={{ marginTop: 12 }} text="Preview of a future feature (SRS §28). There’s no food database yet, so meal ideas show no calorie or nutrient numbers." />

      <Sheet
        visible={!!idea}
        onClose={() => setOpenId(null)}
        eyebrow={idea ? `${cap(idea.slot)} · about ${idea.time} min` : undefined}
        title={idea?.title ?? ''}
        subtitle={idea ? `${idea.cuisine === 'indian' ? 'Indian' : 'Global'}${idea.vegetarian ? ' · vegetarian' : ''}` : undefined}
        footer={
          idea ? (
            chosen.includes(idea.id) ? (
              <Button label="Remove from grocery list" icon={X} variant="secondary" full onPress={() => removeIdea(idea.id)} />
            ) : (
              <Button label="Add to grocery list" icon={ShoppingBasket} full onPress={() => addIdeas([idea.id])} />
            )
          ) : null
        }>
        {idea ? <Recipe idea={idea} /> : null}
      </Sheet>
    </Screen>
  );
}

function IdeaCard({ idea: m, added, onPress }: { idea: MealIdea; added: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${m.title}, ${m.slot}, about ${m.time} minutes. Open recipe`} onPress={onPress} style={({ pressed }) => [styles.idea, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
      <TintIcon icon={SLOT_ICON[m.slot]} tone={SLOT_TONE[m.slot]} size={44} />
      <View style={{ flex: 1 }}>
        <AppText variant="overline" color={colors.textSubtle}>
          {m.slot} · ~{m.time} min
        </AppText>
        <AppText variant="h3" numberOfLines={2} style={{ marginTop: 2 }}>
          {m.title}
        </AppText>
        <View style={styles.tags}>
          <Pill label={m.cuisine === 'indian' ? 'Indian' : 'Global'} tone="peach" />
          {m.vegetarian ? <Pill label="Vegetarian" tone="green" /> : null}
          {added ? <Pill label="On your list" tone="sky" icon={<Check size={11} color={palette.sky[700]} />} /> : null}
        </View>
      </View>
      <ChevronRight size={18} color={colors.textSubtle} />
    </Pressable>
  );
}

function Recipe({ idea }: { idea: MealIdea }) {
  return (
    <View style={{ gap: 18 }}>
      <View>
        <AppText variant="overline" color={palette.green[700]}>
          On the plate
        </AppText>
        <View style={styles.tags}>
          {idea.plate.map((p) => (
            <Pill key={p} label={cap(p)} tone="green" />
          ))}
        </View>
      </View>
      <View>
        <AppText variant="overline" color={palette.green[700]} style={{ marginBottom: 4 }}>
          Ingredients
        </AppText>
        {idea.ingredients.map((ing, i) => (
          <View key={ing.item} style={[styles.ingredient, i < idea.ingredients.length - 1 && styles.border]}>
            <AppText variant="body" style={{ flex: 1 }}>
              {ing.item}
            </AppText>
            <AppText variant="smallMedium" color={palette.ink[600]}>
              {ing.qty}
            </AppText>
          </View>
        ))}
      </View>
      <View>
        <AppText variant="overline" color={palette.green[700]} style={{ marginBottom: 8 }}>
          Steps
        </AppText>
        {idea.steps.map((s, i) => (
          <View key={s} style={styles.step}>
            <View style={styles.stepNum}>
              <AppText variant="caption" color={palette.green[950]} style={{ fontFamily: font.monoMedium }}>
                {i + 1}
              </AppText>
            </View>
            <AppText variant="body" style={{ flex: 1 }}>
              {s}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" muted>
        {MEAL_DISCLAIMER}
      </AppText>
    </View>
  );
}

function AisleCard({ aisle, items, checked, onToggle }: { aisle: GroceryAisle; items: GroceryItem[]; checked: string[]; onToggle: (item: string) => void }) {
  return (
    <Card style={{ marginTop: 12 }}>
      <View style={styles.dayHead}>
        <TintIcon icon={AISLE[aisle].icon} tone={AISLE[aisle].tone} size={34} />
        <AppText variant="h3" style={{ flex: 1 }}>
          {aisle}
        </AppText>
        <AppText variant="caption" muted>
          {items.length} item{items.length === 1 ? '' : 's'}
        </AppText>
      </View>
      {items.map((it, i) => {
        const on = checked.includes(keyOf(it.item));
        return (
          <CheckBox key={it.item} checked={on} onPress={() => onToggle(it.item)} label={`${it.item}, ${it.qty.join(' + ')}`} style={[styles.groceryRow, i < items.length - 1 && styles.border]}>
            <View style={{ flex: 1 }}>
              <AppText variant="body" style={on ? { textDecorationLine: 'line-through', color: colors.textMuted } : undefined}>
                {it.item}
              </AppText>
              <AppText variant="caption" muted numberOfLines={2}>
                {it.qty.join(' + ')} · {it.forMeals.join(', ')}
              </AppText>
            </View>
          </CheckBox>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  idea: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, padding: 14, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: palette.ink[100] },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 8 },
  mealTag: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: palette.butter[50], borderWidth: 1, borderColor: palette.butter[200] },
  groceryRow: { paddingVertical: 10 },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  step: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: palette.butter[400], alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  device: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
});
