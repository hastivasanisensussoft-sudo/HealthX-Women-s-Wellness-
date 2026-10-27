/**
 * Personalised workout builder (SRS §27, §59 Workout Engine): turns goal, fitness level, duration,
 * equipment, location and preferred exercise into a session of Warm-up → Main → Core → Cool-down
 * that fills the chosen minutes. Deterministic rules; never based on cycle phase or assumed hormonal
 * state (§26). General fitness guidance, not a medical prescription.
 */
import type { Workout, WorkoutCategory } from './types';

export type BuilderGoal = 'strength' | 'energy' | 'flexibility' | 'relax';
export type BlockKind = 'warmup' | 'main' | 'core' | 'cooldown';
type Equipment = Workout['equipment'];
type Location = Workout['location'];
type Level = Workout['level'];

interface Exercise {
  id: string;
  name: string;
  block: BlockKind;
  /** Categories this move belongs to (for goal and preference matching). */
  categories: WorkoutCategory[];
  equipment: Equipment;
  /** Where it works; empty = anywhere. */
  locations: Location[];
  minLevel: Level;
  cue: string;
}

const EXERCISES: Exercise[] = [
  // warm-up
  { id: 'march', name: 'Marching in place', block: 'warmup', categories: ['strength', 'cardio', 'walking'], equipment: 'none', locations: [], minLevel: 'beginner', cue: 'Lift knees gently, swing the arms' },
  { id: 'arm_circles', name: 'Arm and shoulder circles', block: 'warmup', categories: ['strength', 'mobility', 'pilates'], equipment: 'none', locations: [], minLevel: 'beginner', cue: 'Small circles growing bigger, both directions' },
  { id: 'hip_circles', name: 'Hip circles', block: 'warmup', categories: ['mobility', 'yoga', 'stretching'], equipment: 'none', locations: [], minLevel: 'beginner', cue: 'Hands on hips, slow circles each way' },
  { id: 'easy_walk', name: 'Easy-pace walk', block: 'warmup', categories: ['walking', 'cardio'], equipment: 'none', locations: ['outdoors', 'gym'], minLevel: 'beginner', cue: 'Conversational pace' },
  { id: 'breath_settle', name: 'Settling breaths', block: 'warmup', categories: ['meditation', 'yoga'], equipment: 'none', locations: [], minLevel: 'beginner', cue: 'Breathe in for 4, out for 6' },
  // main
  { id: 'squat', name: 'Squats', block: 'main', categories: ['strength'], equipment: 'none', locations: [], minLevel: 'beginner', cue: 'Sit back as if to a chair, knees track over toes' },
  { id: 'glute_bridge', name: 'Glute bridge', block: 'main', categories: ['strength', 'pilates'], equipment: 'mat', locations: [], minLevel: 'beginner', cue: 'Press through the heels, pause at the top' },
  { id: 'pushup', name: 'Push-up variation', block: 'main', categories: ['strength'], equipment: 'none', locations: [], minLevel: 'beginner', cue: 'Wall, knee or full — choose what feels steady' },
  { id: 'reverse_lunge', name: 'Reverse lunge', block: 'main', categories: ['strength'], equipment: 'none', locations: [], minLevel: 'intermediate', cue: 'Step back, lower slowly, hold a support if needed' },
  { id: 'band_row', name: 'Band row', block: 'main', categories: ['strength'], equipment: 'band', locations: [], minLevel: 'beginner', cue: 'Squeeze the shoulder blades together' },
  { id: 'db_deadlift', name: 'Dumbbell Romanian deadlift', block: 'main', categories: ['strength'], equipment: 'dumbbells', locations: [], minLevel: 'intermediate', cue: 'Hinge at the hips, back long, weights close to the legs' },
  { id: 'db_press', name: 'Dumbbell shoulder press', block: 'main', categories: ['strength'], equipment: 'dumbbells', locations: [], minLevel: 'beginner', cue: 'Press up, ribs down, lower with control' },
  { id: 'brisk_walk', name: 'Brisk walk intervals', block: 'main', categories: ['walking', 'cardio'], equipment: 'none', locations: ['outdoors', 'gym'], minLevel: 'beginner', cue: '2 min brisk, 1 min easy' },
  { id: 'step_jacks', name: 'Step jacks', block: 'main', categories: ['cardio'], equipment: 'none', locations: ['home', 'gym'], minLevel: 'beginner', cue: 'Step side to side with arm raises — low impact' },
  { id: 'dance', name: 'Free dance', block: 'main', categories: ['cardio'], equipment: 'none', locations: ['home'], minLevel: 'beginner', cue: 'Any music, keep moving' },
  { id: 'cat_cow', name: 'Cat–cow flow', block: 'main', categories: ['yoga', 'mobility', 'stretching'], equipment: 'mat', locations: [], minLevel: 'beginner', cue: 'Move with the breath' },
  { id: 'warrior', name: 'Warrior II flow', block: 'main', categories: ['yoga'], equipment: 'none', locations: [], minLevel: 'beginner', cue: 'Soft front knee, arms long' },
  { id: 'hip_opener', name: 'Low-lunge hip opener', block: 'main', categories: ['mobility', 'stretching', 'yoga'], equipment: 'mat', locations: [], minLevel: 'beginner', cue: 'Ease in; stop at gentle tension' },
  { id: 'thoracic', name: 'Open-book rotations', block: 'main', categories: ['mobility', 'pilates'], equipment: 'mat', locations: [], minLevel: 'beginner', cue: 'Follow the top hand with your eyes' },
  { id: 'body_scan', name: 'Body-scan meditation', block: 'main', categories: ['meditation'], equipment: 'none', locations: [], minLevel: 'beginner', cue: 'Notice each part of the body without judging' },
  { id: 'box_breath', name: 'Box breathing', block: 'main', categories: ['meditation'], equipment: 'none', locations: [], minLevel: 'beginner', cue: 'In 4 · hold 4 · out 4 · hold 4' },
  // core
  { id: 'dead_bug', name: 'Dead bug', block: 'core', categories: ['strength', 'pilates'], equipment: 'mat', locations: [], minLevel: 'beginner', cue: 'Lower back stays gently on the floor' },
  { id: 'plank', name: 'Forearm plank', block: 'core', categories: ['strength', 'pilates'], equipment: 'mat', locations: [], minLevel: 'intermediate', cue: 'Knees down is a great option' },
  { id: 'bird_dog', name: 'Bird dog', block: 'core', categories: ['pilates', 'mobility', 'yoga'], equipment: 'none', locations: [], minLevel: 'beginner', cue: 'Reach long, keep the hips level' },
  { id: 'standing_crunch', name: 'Standing knee-to-elbow', block: 'core', categories: ['cardio', 'walking', 'strength'], equipment: 'none', locations: [], minLevel: 'beginner', cue: 'Slow and controlled' },
  // cool-down
  { id: 'hamstring', name: 'Hamstring stretch', block: 'cooldown', categories: ['strength', 'walking', 'cardio', 'stretching'], equipment: 'none', locations: [], minLevel: 'beginner', cue: 'Hinge forward until you feel a gentle stretch' },
  { id: 'child_pose', name: 'Child’s pose', block: 'cooldown', categories: ['yoga', 'pilates', 'mobility', 'stretching'], equipment: 'mat', locations: [], minLevel: 'beginner', cue: 'Knees wide, breathe into the back' },
  { id: 'calf', name: 'Calf stretch', block: 'cooldown', categories: ['walking', 'cardio'], equipment: 'none', locations: [], minLevel: 'beginner', cue: 'Against a wall or step' },
  { id: 'rest_breath', name: 'Resting breath', block: 'cooldown', categories: ['meditation', 'yoga', 'stretching'], equipment: 'none', locations: [], minLevel: 'beginner', cue: 'Lie or sit comfortably for a few breaths' },
];

const GOAL_CATS: Record<BuilderGoal, WorkoutCategory[]> = {
  strength: ['strength', 'pilates'],
  energy: ['cardio', 'walking'],
  flexibility: ['yoga', 'mobility', 'stretching'],
  relax: ['meditation', 'stretching', 'yoga'],
};
const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];
const EQUIP_RANK: Record<Equipment, number> = { none: 0, mat: 1, band: 2, dumbbells: 3 };
const SETS: Record<Level, string> = { beginner: '2 rounds', intermediate: '3 rounds', advanced: '3–4 rounds' };

export interface SessionItem {
  name: string;
  /** e.g. "3 min" or "2 rounds · 40 s on, 20 s rest". */
  prescription: string;
  cue: string;
}
export interface SessionBlock {
  kind: BlockKind;
  label: string;
  minutes: number;
  items: SessionItem[];
}
export interface BuiltSession {
  title: string;
  category: WorkoutCategory;
  totalMin: number;
  blocks: SessionBlock[];
}
export interface BuilderInput {
  goal: BuilderGoal;
  level: Level;
  minutes: number;
  equipment: Equipment;
  location: Location;
  preferred?: WorkoutCategory | null;
}

/** Minutes per block; always adds up to `total`. */
export function splitMinutes(total: number, goal: BuilderGoal): Record<BlockKind, number> {
  const warmup = Math.max(2, Math.round(total * 0.15));
  const cooldown = Math.max(2, Math.round(total * 0.15));
  const core = goal === 'relax' ? 0 : Math.max(2, Math.round(total * 0.2));
  return { warmup, core, cooldown, main: Math.max(1, total - warmup - core - cooldown) };
}

const LABEL: Record<BlockKind, string> = { warmup: 'Warm-up', main: 'Main set', core: 'Core', cooldown: 'Cool-down' };

export function buildWorkoutSession(input: BuilderInput): BuiltSession {
  const cats = [...new Set([...(input.preferred ? [input.preferred] : []), ...GOAL_CATS[input.goal]])];
  const fits = (e: Exercise) =>
    EQUIP_RANK[e.equipment] <= EQUIP_RANK[input.equipment] && (!e.locations.length || e.locations.includes(input.location)) && LEVELS.indexOf(e.minLevel) <= LEVELS.indexOf(input.level);
  const rank = (e: Exercise) => {
    const i = cats.findIndex((c) => e.categories.includes(c));
    return i === -1 ? 99 : i;
  };
  const pick = (block: BlockKind, n: number) =>
    EXERCISES.filter((e) => e.block === block && fits(e))
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, n);
  const mins = splitMinutes(input.minutes, input.goal);
  const mainCount = Math.min(4, Math.max(2, Math.round(mins.main / 4)));
  const blocks: SessionBlock[] = (['warmup', 'main', 'core', 'cooldown'] as BlockKind[])
    .filter((k) => mins[k] > 0)
    .map((kind) => {
      const chosen = pick(kind, kind === 'main' ? mainCount : 2);
      const each = Math.max(1, Math.round(mins[kind] / Math.max(1, chosen.length)));
      const timed = kind === 'warmup' || kind === 'cooldown' || input.goal === 'relax' || input.goal === 'flexibility';
      return {
        kind,
        label: LABEL[kind],
        minutes: mins[kind],
        items: chosen.map((e) => ({ name: e.name, prescription: timed ? `${each} min` : `${SETS[input.level]} · 40 s on, 20 s rest`, cue: e.cue })),
      };
    });
  const category = cats[0];
  const title = `${input.minutes}-minute ${input.goal === 'relax' ? 'unwind' : input.goal} session`;
  return { title: title[0].toUpperCase() + title.slice(1), category, totalMin: blocks.reduce((a, b) => a + b.minutes, 0), blocks };
}
