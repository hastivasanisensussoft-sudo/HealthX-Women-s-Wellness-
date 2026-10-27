/**
 * Meal ideas, simple recipes, a 3-day meal plan and a grocery list (SRS §28 "potential future
 * features", built 2026-10-27 as a frontend preview). General food ideas only: no calorie or nutrient
 * numbers (there is no verified food database yet) and no individual treatment claims. People with
 * allergies, medical diets or pregnancy food guidance should follow their healthcare professional.
 */
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Cuisine = 'indian' | 'global';

export interface MealIdea {
  id: string;
  title: string;
  slot: MealSlot;
  cuisine: Cuisine;
  vegetarian: boolean;
  /** Minutes, roughly. */
  time: number;
  /** "Plate" balance cues — what the meal brings, without numbers. */
  plate: ('protein' | 'fibre' | 'whole grains' | 'vegetables' | 'fruit' | 'healthy fats')[];
  ingredients: { item: string; qty: string; aisle: GroceryAisle }[];
  steps: string[];
}

export type GroceryAisle = 'Produce' | 'Grains & pulses' | 'Dairy & eggs' | 'Protein' | 'Pantry & spices';

export const MEAL_DISCLAIMER =
  'General meal ideas, not dietary or medical advice. Check ingredients for allergies, and follow your healthcare professional’s food guidance if you are pregnant or on a medical diet.';

export const MEAL_IDEAS: MealIdea[] = [
  {
    id: 'm_poha',
    title: 'Vegetable poha',
    slot: 'breakfast',
    cuisine: 'indian',
    vegetarian: true,
    time: 20,
    plate: ['whole grains', 'vegetables'],
    ingredients: [
      { item: 'Flattened rice (poha)', qty: '1 cup', aisle: 'Grains & pulses' },
      { item: 'Onion', qty: '1 small', aisle: 'Produce' },
      { item: 'Green peas', qty: '½ cup', aisle: 'Produce' },
      { item: 'Peanuts', qty: '2 tbsp', aisle: 'Pantry & spices' },
      { item: 'Mustard seeds, turmeric, curry leaves', qty: 'to taste', aisle: 'Pantry & spices' },
      { item: 'Lemon', qty: '½', aisle: 'Produce' },
    ],
    steps: ['Rinse the poha and let it soften for 5 minutes.', 'Temper mustard seeds and curry leaves, then soften the onion and peas.', 'Add turmeric, peanuts and the poha; toss well.', 'Finish with lemon juice.'],
  },
  {
    id: 'm_besan_chilla',
    title: 'Besan chilla with mint chutney',
    slot: 'breakfast',
    cuisine: 'indian',
    vegetarian: true,
    time: 20,
    plate: ['protein', 'vegetables'],
    ingredients: [
      { item: 'Gram flour (besan)', qty: '1 cup', aisle: 'Grains & pulses' },
      { item: 'Tomato and onion', qty: '1 each', aisle: 'Produce' },
      { item: 'Fresh coriander and mint', qty: '1 bunch', aisle: 'Produce' },
      { item: 'Plain yoghurt', qty: '½ cup', aisle: 'Dairy & eggs' },
    ],
    steps: ['Whisk besan with water to a pouring batter; stir in chopped vegetables.', 'Cook thin pancakes on a lightly oiled pan, 2 minutes a side.', 'Blend mint, coriander and yoghurt for the chutney.'],
  },
  {
    id: 'm_overnight_oats',
    title: 'Overnight oats with fruit and seeds',
    slot: 'breakfast',
    cuisine: 'global',
    vegetarian: true,
    time: 5,
    plate: ['whole grains', 'fruit', 'fibre'],
    ingredients: [
      { item: 'Rolled oats', qty: '½ cup', aisle: 'Grains & pulses' },
      { item: 'Milk or plant milk', qty: '¾ cup', aisle: 'Dairy & eggs' },
      { item: 'Chia seeds', qty: '1 tbsp', aisle: 'Pantry & spices' },
      { item: 'Berries or banana', qty: '1 handful', aisle: 'Produce' },
    ],
    steps: ['Mix oats, milk and chia in a jar.', 'Refrigerate overnight.', 'Top with fruit in the morning.'],
  },
  {
    id: 'm_veg_omelette',
    title: 'Spinach and tomato omelette',
    slot: 'breakfast',
    cuisine: 'global',
    vegetarian: false,
    time: 10,
    plate: ['protein', 'vegetables'],
    ingredients: [
      { item: 'Eggs', qty: '2', aisle: 'Dairy & eggs' },
      { item: 'Spinach', qty: '1 handful', aisle: 'Produce' },
      { item: 'Tomato', qty: '1', aisle: 'Produce' },
      { item: 'Wholegrain toast', qty: '1 slice', aisle: 'Grains & pulses' },
    ],
    steps: ['Wilt the spinach and tomato in a pan.', 'Pour in beaten eggs and cook gently until set.', 'Serve with toast.'],
  },
  {
    id: 'm_dal_rice',
    title: 'Moong dal with rice and kachumber',
    slot: 'lunch',
    cuisine: 'indian',
    vegetarian: true,
    time: 35,
    plate: ['protein', 'whole grains', 'vegetables'],
    ingredients: [
      { item: 'Yellow moong dal', qty: '½ cup', aisle: 'Grains & pulses' },
      { item: 'Brown or white rice', qty: '½ cup', aisle: 'Grains & pulses' },
      { item: 'Cucumber, tomato, onion', qty: '1 each', aisle: 'Produce' },
      { item: 'Cumin, turmeric, garlic', qty: 'to taste', aisle: 'Pantry & spices' },
    ],
    steps: ['Pressure-cook or simmer the dal with turmeric until soft.', 'Temper cumin and garlic and stir in.', 'Cook the rice; chop the salad with lemon and salt.'],
  },
  {
    id: 'm_rajma',
    title: 'Rajma with jeera rice',
    slot: 'lunch',
    cuisine: 'indian',
    vegetarian: true,
    time: 40,
    plate: ['protein', 'fibre', 'whole grains'],
    ingredients: [
      { item: 'Kidney beans (cooked or canned)', qty: '1 cup', aisle: 'Grains & pulses' },
      { item: 'Tomato purée', qty: '1 cup', aisle: 'Pantry & spices' },
      { item: 'Onion, ginger, garlic', qty: 'to taste', aisle: 'Produce' },
      { item: 'Rice', qty: '½ cup', aisle: 'Grains & pulses' },
    ],
    steps: ['Soften onion, ginger and garlic; add spices and tomato.', 'Add beans and simmer 15 minutes.', 'Serve with cumin rice.'],
  },
  {
    id: 'm_quinoa_bowl',
    title: 'Chickpea and roasted vegetable grain bowl',
    slot: 'lunch',
    cuisine: 'global',
    vegetarian: true,
    time: 30,
    plate: ['protein', 'whole grains', 'vegetables', 'healthy fats'],
    ingredients: [
      { item: 'Quinoa or millet', qty: '½ cup', aisle: 'Grains & pulses' },
      { item: 'Chickpeas', qty: '1 cup', aisle: 'Grains & pulses' },
      { item: 'Peppers, courgette, red onion', qty: '2 cups', aisle: 'Produce' },
      { item: 'Olive oil and lemon', qty: '1 tbsp', aisle: 'Pantry & spices' },
    ],
    steps: ['Roast the vegetables and chickpeas for 20–25 minutes.', 'Cook the grain.', 'Toss together with olive oil and lemon.'],
  },
  {
    id: 'm_chicken_wrap',
    title: 'Grilled chicken and salad wrap',
    slot: 'lunch',
    cuisine: 'global',
    vegetarian: false,
    time: 20,
    plate: ['protein', 'vegetables', 'whole grains'],
    ingredients: [
      { item: 'Chicken breast', qty: '1 small', aisle: 'Protein' },
      { item: 'Wholewheat wraps', qty: '2', aisle: 'Grains & pulses' },
      { item: 'Lettuce, carrot, cucumber', qty: '1 bowl', aisle: 'Produce' },
      { item: 'Yoghurt dressing', qty: '2 tbsp', aisle: 'Dairy & eggs' },
    ],
    steps: ['Season and grill the chicken until cooked through.', 'Slice and fill the wraps with salad.', 'Add a spoon of yoghurt dressing.'],
  },
  {
    id: 'm_palak_paneer',
    title: 'Palak paneer with roti',
    slot: 'dinner',
    cuisine: 'indian',
    vegetarian: true,
    time: 35,
    plate: ['protein', 'vegetables', 'whole grains'],
    ingredients: [
      { item: 'Spinach', qty: '1 large bunch', aisle: 'Produce' },
      { item: 'Paneer', qty: '150 g', aisle: 'Dairy & eggs' },
      { item: 'Onion, tomato, garlic', qty: '1 each', aisle: 'Produce' },
      { item: 'Wholewheat flour (atta)', qty: '1 cup', aisle: 'Grains & pulses' },
    ],
    steps: ['Blanch and blend the spinach.', 'Cook onion, garlic and tomato with spices; add the spinach.', 'Add paneer cubes and simmer 5 minutes.', 'Serve with rotis.'],
  },
  {
    id: 'm_veg_khichdi',
    title: 'Vegetable khichdi',
    slot: 'dinner',
    cuisine: 'indian',
    vegetarian: true,
    time: 30,
    plate: ['protein', 'whole grains', 'vegetables'],
    ingredients: [
      { item: 'Rice and moong dal', qty: '½ cup each', aisle: 'Grains & pulses' },
      { item: 'Carrot, beans, peas', qty: '1 cup', aisle: 'Produce' },
      { item: 'Ghee, cumin, turmeric', qty: 'to taste', aisle: 'Pantry & spices' },
    ],
    steps: ['Rinse rice and dal.', 'Cook everything together with water and turmeric until soft.', 'Finish with a cumin tempering.'],
  },
  {
    id: 'm_fish_curry',
    title: 'Light fish curry with rice',
    slot: 'dinner',
    cuisine: 'indian',
    vegetarian: false,
    time: 35,
    plate: ['protein', 'vegetables', 'whole grains'],
    ingredients: [
      { item: 'Firm white fish', qty: '200 g', aisle: 'Protein' },
      { item: 'Tomato, onion, curry leaves', qty: '1 each', aisle: 'Produce' },
      { item: 'Coconut milk (light)', qty: '½ cup', aisle: 'Pantry & spices' },
      { item: 'Rice', qty: '½ cup', aisle: 'Grains & pulses' },
    ],
    steps: ['Cook the onion, tomato and spices.', 'Add coconut milk and simmer.', 'Add the fish and cook gently until it flakes.'],
  },
  {
    id: 'm_tofu_stirfry',
    title: 'Tofu and vegetable stir-fry',
    slot: 'dinner',
    cuisine: 'global',
    vegetarian: true,
    time: 25,
    plate: ['protein', 'vegetables', 'whole grains'],
    ingredients: [
      { item: 'Firm tofu', qty: '200 g', aisle: 'Protein' },
      { item: 'Broccoli, peppers, spring onion', qty: '2 cups', aisle: 'Produce' },
      { item: 'Soy sauce, ginger, garlic', qty: 'to taste', aisle: 'Pantry & spices' },
      { item: 'Brown rice or noodles', qty: '½ cup', aisle: 'Grains & pulses' },
    ],
    steps: ['Pan-fry the tofu until golden.', 'Stir-fry the vegetables with ginger and garlic.', 'Toss together with soy sauce; serve with rice or noodles.'],
  },
  {
    id: 'm_sprout_chaat',
    title: 'Sprouts chaat',
    slot: 'snack',
    cuisine: 'indian',
    vegetarian: true,
    time: 10,
    plate: ['protein', 'fibre', 'vegetables'],
    ingredients: [
      { item: 'Sprouted moong', qty: '1 cup', aisle: 'Grains & pulses' },
      { item: 'Onion, tomato, cucumber', qty: '½ each', aisle: 'Produce' },
      { item: 'Chaat masala and lemon', qty: 'to taste', aisle: 'Pantry & spices' },
    ],
    steps: ['Steam the sprouts briefly if you prefer them softer.', 'Mix with chopped vegetables.', 'Season with chaat masala and lemon.'],
  },
  {
    id: 'm_roasted_chana',
    title: 'Roasted chana and fruit',
    slot: 'snack',
    cuisine: 'indian',
    vegetarian: true,
    time: 2,
    plate: ['protein', 'fruit'],
    ingredients: [
      { item: 'Roasted chana', qty: '1 handful', aisle: 'Grains & pulses' },
      { item: 'Seasonal fruit', qty: '1 piece', aisle: 'Produce' },
    ],
    steps: ['Pair a handful of roasted chana with a piece of fruit.'],
  },
  {
    id: 'm_yoghurt_parfait',
    title: 'Yoghurt, fruit and nut parfait',
    slot: 'snack',
    cuisine: 'global',
    vegetarian: true,
    time: 5,
    plate: ['protein', 'fruit', 'healthy fats'],
    ingredients: [
      { item: 'Plain yoghurt', qty: '¾ cup', aisle: 'Dairy & eggs' },
      { item: 'Berries', qty: '1 handful', aisle: 'Produce' },
      { item: 'Walnuts or almonds', qty: '1 tbsp', aisle: 'Pantry & spices' },
    ],
    steps: ['Layer yoghurt, fruit and nuts in a glass.'],
  },
  {
    id: 'm_hummus_veg',
    title: 'Hummus with vegetable sticks',
    slot: 'snack',
    cuisine: 'global',
    vegetarian: true,
    time: 5,
    plate: ['protein', 'vegetables', 'fibre'],
    ingredients: [
      { item: 'Hummus', qty: '3 tbsp', aisle: 'Pantry & spices' },
      { item: 'Carrot, cucumber, pepper', qty: '1 cup', aisle: 'Produce' },
    ],
    steps: ['Slice the vegetables and dip.'],
  },
];

export interface MealPlanFilters {
  vegetarian: boolean;
  cuisine: Cuisine | 'any';
}

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** Ideas matching the filters for one slot. */
export function mealIdeasFor(slot: MealSlot | 'all', f: MealPlanFilters): MealIdea[] {
  return MEAL_IDEAS.filter((m) => (slot === 'all' || m.slot === slot) && (!f.vegetarian || m.vegetarian) && (f.cuisine === 'any' || m.cuisine === f.cuisine));
}

/** A simple rotating plan: one idea per slot per day, varied across days. */
export function buildMealPlan(f: MealPlanFilters, days = 3): { day: number; meals: Record<MealSlot, MealIdea | null> }[] {
  return Array.from({ length: days }, (_, d) => ({
    day: d + 1,
    meals: Object.fromEntries(
      SLOTS.map((slot) => {
        const pool = mealIdeasFor(slot, f);
        return [slot, pool.length ? pool[d % pool.length] : null];
      }),
    ) as Record<MealSlot, MealIdea | null>,
  }));
}

export interface GroceryItem {
  item: string;
  aisle: GroceryAisle;
  /** Quantities from each recipe that needs it. */
  qty: string[];
  forMeals: string[];
}

/** Merges the ingredients of the chosen ideas into an aisle-sorted shopping list. */
export function groceryList(ideaIds: string[]): GroceryItem[] {
  const byItem = new Map<string, GroceryItem>();
  for (const id of ideaIds) {
    const idea = MEAL_IDEAS.find((m) => m.id === id);
    if (!idea) continue;
    for (const ing of idea.ingredients) {
      const key = ing.item.toLowerCase();
      const cur = byItem.get(key) ?? { item: ing.item, aisle: ing.aisle, qty: [], forMeals: [] };
      cur.qty.push(ing.qty);
      if (!cur.forMeals.includes(idea.title)) cur.forMeals.push(idea.title);
      byItem.set(key, cur);
    }
  }
  const order: GroceryAisle[] = ['Produce', 'Grains & pulses', 'Dairy & eggs', 'Protein', 'Pantry & spices'];
  return [...byItem.values()].sort((a, b) => order.indexOf(a.aisle) - order.indexOf(b.aisle) || a.item.localeCompare(b.item));
}
