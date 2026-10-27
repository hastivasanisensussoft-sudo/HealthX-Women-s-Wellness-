import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Breathing circle. Idle, the halo loops softly like a GIF preview (`animate-breathe`);
 * while an exercise runs, the halo follows the step (in / hold / out) with a slow scale.
 * The core stays still so its text is always readable. Motion is disabled under
 * prefers-reduced-motion by the global styles.
 */
export function BreathingOrb({ running, scale, seconds, children, size = 240, className }: { running: boolean; scale: number; seconds: number; children?: ReactNode; size?: number; className?: string }) {
  const follow = running ? { transform: `scale(${scale})`, transition: `transform ${seconds}s ease-in-out` } : undefined;
  return (
    <div className={cn('relative flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
      <span aria-hidden className="absolute inset-0 rounded-full border border-dashed border-white/25" />
      <span aria-hidden className={cn('absolute inset-[3%] rounded-full bg-green-300/25', !running && 'animate-breathe')} style={follow} />
      <span aria-hidden className={cn('absolute inset-[12%] rounded-full bg-green-200/30', !running && 'animate-breathe [animation-delay:-0.6s]')} style={follow} />
      <span aria-hidden className="absolute inset-[22%] rounded-full bg-gradient-to-br from-green-50 via-green-100 to-lavender-100 shadow-lift" />
      <div className="relative flex w-[54%] flex-col items-center text-center">{children}</div>
    </div>
  );
}
