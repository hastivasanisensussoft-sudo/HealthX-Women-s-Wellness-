/**
 * Video previews (free Mixkit clips in packages/shared/assets/videos, see CREDITS.md).
 * Each clip is a short preview of a guided routine; the steps are the routine itself,
 * so the screen stays useful when a video can't play (offline, unsupported, missing).
 * Copy follows the HealthX safety rules: gentle, non-medical, no outcome promises.
 */
import type { PhotoKey } from './types';

export type VideoKey = 'yoga-flow' | 'breathing' | 'walk-outdoors' | 'healthy-cooking' | 'hydration' | 'sleep-winddown' | 'strength';

export type VideoCategory = 'movement' | 'mind' | 'nutrition' | 'hydration' | 'sleep';

export interface VideoMeta {
  key: VideoKey;
  title: string;
  description: string;
  category: VideoCategory;
  /** Length of the guided routine the preview belongs to. */
  sessionMinutes: number;
  /** Photo shown while the poster loads, or instead of it if the video assets are missing. */
  photo: PhotoKey;
  steps: string[];
}

export const VIDEOS: Record<VideoKey, VideoMeta> = {
  'yoga-flow': {
    key: 'yoga-flow',
    title: 'Gentle morning yoga flow',
    description: 'Slow, low-impact stretches to wake up your body. Move within a range that feels comfortable for you today.',
    category: 'movement',
    sessionMinutes: 12,
    photo: 'yoga-home',
    steps: ['Child’s pose — 5 slow breaths', 'Cat–cow — 8 rounds, moving with your breath', 'Low lunge — 30 seconds each side', 'Seated forward fold — soften, don’t force', 'Rest on your back for one minute'],
  },
  breathing: {
    key: 'breathing',
    title: 'Box breathing to settle',
    description: 'A simple breathing pattern many people use to feel calmer. Stop if you feel light-headed and breathe normally.',
    category: 'mind',
    sessionMinutes: 5,
    photo: 'meditation',
    steps: ['Sit or lie comfortably and relax your shoulders', 'Breathe in through your nose for 4', 'Hold gently for 4', 'Breathe out slowly for 4–6', 'Repeat for 4–5 minutes'],
  },
  'walk-outdoors': {
    key: 'walk-outdoors',
    title: 'Mindful outdoor walk',
    description: 'A relaxed walk with a few simple attention cues. Any pace that feels good counts.',
    category: 'movement',
    sessionMinutes: 20,
    photo: 'walking-outdoors',
    steps: ['Start with five easy minutes', 'Notice five things you can see', 'Pick up the pace a little for ten minutes', 'Ease back down for the last five', 'Drink some water when you get back'],
  },
  'healthy-cooking': {
    key: 'healthy-cooking',
    title: 'Colourful bowl in 15 minutes',
    description: 'A balanced, flexible meal idea: grains, vegetables, protein and a simple dressing. Swap anything to suit your taste.',
    category: 'nutrition',
    sessionMinutes: 15,
    photo: 'healthy-food',
    steps: ['Start with a base: rice, quinoa or millets', 'Add two or three vegetables, raw or roasted', 'Add a protein: dal, paneer, tofu, eggs or beans', 'Finish with yoghurt or a lemon–herb dressing', 'Add seeds or nuts for crunch'],
  },
  hydration: {
    key: 'hydration',
    title: 'Easy ways to drink more water',
    description: 'Small habits that make it easier to reach your daily water target.',
    category: 'hydration',
    sessionMinutes: 3,
    photo: 'water',
    steps: ['Keep a bottle where you can see it', 'Have a glass with every meal', 'Add lemon, mint or cucumber for flavour', 'Link a glass to a daily habit, like your morning tea', 'Log it in HealthX to see your progress'],
  },
  'sleep-winddown': {
    key: 'sleep-winddown',
    title: 'Ten-minute wind-down',
    description: 'A calm routine for the end of the day. Dim the lights and give yourself time to slow down.',
    category: 'sleep',
    sessionMinutes: 10,
    photo: 'sleep',
    steps: ['Dim the lights and put your phone on night mode', 'Write down tomorrow’s top three tasks', 'Gentle neck and shoulder rolls', 'Slow breathing: in for 4, out for 6', 'Read or listen to something calm'],
  },
  strength: {
    key: 'strength',
    title: 'Beginner strength basics',
    description: 'A short, beginner-friendly strength routine. Use light weights or none, and rest whenever you need to.',
    category: 'movement',
    sessionMinutes: 15,
    photo: 'strength-training',
    steps: ['Warm up: march on the spot for two minutes', 'Squats to a chair — 2 × 10', 'Wall push-ups — 2 × 8', 'Glute bridges — 2 × 12', 'Cool down with gentle stretches'],
  },
};

export const VIDEO_LIST: VideoMeta[] = Object.values(VIDEOS);
