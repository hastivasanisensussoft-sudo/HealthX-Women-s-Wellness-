import type { CommunityPost } from '../types';

/**
 * SAMPLE posts for the Phase 4 community preview. Names are fictional; moderation,
 * reporting and blocking are simulated in the demo (backend: community module).
 */
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export function seedCommunity(): CommunityPost[] {
  return [
    { id: 'p1', group: 'Fitness', author: 'Anjali K.', initials: 'AK', at: hoursAgo(2), text: 'Finished my first 5K walk this week! Starting slow really helped. 💚', likes: 24, comments: 6 },
    { id: 'p2', group: 'Fitness', author: 'Meera R.', initials: 'MR', at: hoursAgo(5), text: 'Any easy 15-minute strength routines for beginners at home?', likes: 11, comments: 9 },
    { id: 'p3', group: 'Yoga', author: 'Sana P.', initials: 'SP', at: hoursAgo(26), text: 'Morning yoga + a glass of water first thing = better energy for me.', likes: 32, comments: 4 },
    { id: 'p4', group: 'Nutrition', author: 'Ritu D.', initials: 'RD', at: hoursAgo(30), text: 'Batch-cooked dal and roasted veggies on Sunday — weekday lunches sorted.', likes: 18, comments: 3 },
    { id: 'p5', group: 'Menopause', author: 'Kavita S.', initials: 'KS', at: hoursAgo(50), text: 'Keeping a fan and a glass of cold water by the bed has made nights easier for me.', likes: 41, comments: 12 },
    { id: 'p6', group: 'Sleep', author: 'Nisha T.', initials: 'NT', at: hoursAgo(72), text: 'Phone out of the bedroom for a week. Falling asleep feels calmer.', likes: 15, comments: 2 },
    { id: 'p7', group: 'Running', author: 'Leah M.', initials: 'LM', at: hoursAgo(96), text: 'Couch-to-5K week 4 done. Slow and steady!', likes: 22, comments: 5 },
  ];
}
