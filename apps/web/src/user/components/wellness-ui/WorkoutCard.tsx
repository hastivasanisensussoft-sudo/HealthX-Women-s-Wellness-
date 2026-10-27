import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { WORKOUT_CATEGORIES, type Workout } from '@healthx/shared';
import { Photo } from '@/components/media/Photo';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { levelBars, workoutPhoto } from './media';

/** Three little bars for beginner / intermediate / advanced (text label kept alongside). */
export function LevelMeter({ level, dark }: { level: Workout['level']; dark?: boolean }) {
  const n = levelBars(level);
  return (
    <span className="inline-flex items-end gap-[3px]" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span key={i} className={cn('w-[4px] rounded-full', i === 1 ? 'h-1.5' : i === 2 ? 'h-2.5' : 'h-3.5', i <= n ? (dark ? 'bg-white' : 'bg-green-600') : dark ? 'bg-white/30' : 'bg-ink-200')} />
      ))}
    </span>
  );
}

/** Photo card for the workout library (Fitness) and related workouts (Workout detail). */
export function WorkoutCard({ w, className }: { w: Workout; className?: string }) {
  const cat = WORKOUT_CATEGORIES.find((c) => c.key === w.category);
  return (
    <Link to={`/app/fitness/${w.id}`} className={cn('group flex min-w-0 flex-col overflow-hidden rounded-3xl bg-white shadow-xs ring-1 ring-inset ring-ink-100 transition duration-300 hover:-translate-y-1 hover:shadow-card', className)}>
      <div className="relative h-44 shrink-0 overflow-hidden">
        <Photo photo={workoutPhoto(w)} alt="" shape="none" className="h-full w-full" imgClassName="transition duration-700 group-hover:scale-105" position="50% 35%" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-green-950/70 via-green-950/10 to-transparent" />
        {cat && (
          <span className="glass absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-green-900">
            <Icon name={cat.icon} className="h-3.5 w-3.5" /> {cat.label}
          </span>
        )}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-green-950/50 px-2.5 py-1 font-mono text-[11.5px] text-white backdrop-blur">
          <Clock className="h-3.5 w-3.5" /> {w.durationMin} min
        </span>
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-green-950/50 px-2.5 py-1 text-[11.5px] font-semibold capitalize text-white backdrop-blur">
          <LevelMeter level={w.level} dark /> {w.level}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="font-display text-[17px] font-semibold leading-snug text-ink-900 group-hover:text-green-800">{w.title}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-500">{w.description}</p>
        <div className="mt-auto flex items-center gap-2 pt-4">
          <span className="rounded-full bg-ink-50 px-2.5 py-1 text-xs font-semibold capitalize text-ink-600 ring-1 ring-inset ring-ink-100">{w.equipment === 'none' ? 'No equipment' : w.equipment}</span>
          <span className="rounded-full bg-ink-50 px-2.5 py-1 text-xs font-semibold capitalize text-ink-600 ring-1 ring-inset ring-ink-100">{w.location}</span>
          <span aria-hidden className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700 transition group-hover:bg-green-700 group-hover:text-white">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
