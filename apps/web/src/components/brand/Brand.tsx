import { Link } from 'react-router-dom';
import { LOGO_PATHS, MOOD_FACES, palette, type MoodLevel, type PhotoKey, type Shape } from '@healthx/shared';
import { cn, initials } from '@/lib/utils';
import { photo } from '@/lib/photos';

/** Theme-aware colour for the logo (follows the accent theme). */
const brand = (shade: number) => `rgb(var(--c-green-${shade}))`;

export function LogoMark({ className = 'h-9 w-9', dark }: { className?: string; dark?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="11" style={{ fill: dark ? '#FFFFFF' : brand(800) }} />
      <path d={LOGO_PATHS.drop} transform="translate(0 0.5)" style={{ fill: dark ? palette.green[300] : palette.green[200] }} />
      <path d={LOGO_PATHS.leaf} style={{ fill: dark ? '#FFFFFF' : brand(800) }} />
      <path d={LOGO_PATHS.vein} style={{ stroke: dark ? palette.green[500] : palette.green[300] }} strokeWidth="0.8" fill="none" />
      <circle cx="24.5" cy="8" r="2.4" fill={palette.rose[300]} />
    </svg>
  );
}

export function Logo({ to = '/', light, className, tagline = true }: { to?: string; light?: boolean; className?: string; tagline?: boolean }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5', className)} aria-label="HealthX Women's Wellness home">
      <LogoMark dark={light} />
      <span className="leading-none">
        <span className={cn('block font-display text-[21px] font-semibold tracking-[-0.03em]', light ? 'text-white' : 'text-green-950')}>
          Health<span className={light ? 'text-green-300' : 'text-green-500'}>X</span>
        </span>
        {tagline && <span className={cn('mt-0.5 block font-mono text-[9.5px] font-medium uppercase tracking-[0.2em]', light ? 'text-green-200/80' : 'text-ink-400')}>Women’s Wellness</span>}
      </span>
    </Link>
  );
}

function ShapeEl({ s }: { s: Shape }) {
  if (s.kind === 'circle') return <circle cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} opacity={s.opacity} />;
  return <path d={s.d} fill={s.fill ?? 'none'} stroke={s.stroke} strokeWidth={s.strokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity={s.opacity} />;
}

/** Friendly mood character (shared geometry with mobile). */
export function MoodFace({ mood, size = 40, className, ring }: { mood: MoodLevel; size?: number; className?: string; ring?: boolean }) {
  const f = MOOD_FACES[mood];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="32" fill={f.bg} />
      {ring && <circle cx="32" cy="32" r="30.5" fill="none" stroke={palette.green[600]} strokeWidth="3" />}
      {f.shapes.map((s, i) => (
        <ShapeEl key={i} s={s} />
      ))}
    </svg>
  );
}

export function Avatar({ name, photoKey, size = 40, className }: { name: string; photoKey?: PhotoKey; size?: number; className?: string }) {
  const src = photo(photoKey);
  return src ? (
    <img src={src} alt={name} width={size} height={size} className={cn('shrink-0 rounded-full object-cover ring-2 ring-white', className)} style={{ width: size, height: size }} />
  ) : (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-green-100 font-display font-semibold text-green-800 ring-2 ring-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

/* ---------- decorative shapes (Mira leaves, watercolour and floral references) ---------- */

/** A single soft leaf. */
export function Leaf({ className, color = palette.rose[200], vein = true }: { className?: string; color?: string; vein?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path d="M8 92 C8 40 40 8 92 8 C92 60 60 92 8 92 Z" style={{ fill: color }} />
      {vein && <path d="M14 86 C34 66 56 44 84 16" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" fill="none" />}
    </svg>
  );
}

/** Pink + white leaf pair that sits behind arch portraits (Mira onboarding reference). Follows light/dark mode. */
export function LeafPair({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('pointer-events-none absolute', className)}>
      <Leaf className="absolute left-0 top-0 h-[58%] w-[58%] -rotate-[8deg] motion-safe:animate-sway motion-safe:[animation-duration:9s]" color="rgb(var(--c-rose-200))" />
      <Leaf className="absolute right-0 top-[4%] h-[46%] w-[46%] rotate-[96deg] motion-safe:animate-sway motion-safe:[animation-duration:11s]" color="rgb(var(--c-white))" />
    </span>
  );
}

export function Blob({ className, color = palette.green[100] }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <path
        fill={color}
        d="M43.2,-58.6C55.1,-49.6,63.4,-35.4,68.3,-19.6C73.2,-3.9,74.7,13.4,68.4,27.3C62.1,41.2,48.1,51.8,32.9,59.4C17.7,67,1.4,71.6,-15.6,69.9C-32.6,68.2,-50.3,60.2,-61.3,46.6C-72.3,33,-76.6,13.8,-73.6,-3.9C-70.6,-21.5,-60.3,-37.6,-46.5,-46.4C-32.7,-55.2,-16.3,-56.7,0.1,-56.8C16.6,-57,31.3,-67.7,43.2,-58.6Z"
        transform="translate(100 100)"
      />
    </svg>
  );
}

export function Sprig({ className, color = palette.green[400] }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 80 120" className={className} aria-hidden fill="none">
      <path d="M40 118 C40 80 42 45 50 6" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      {[
        [44, 92, -1],
        [45, 70, 1],
        [46, 50, -1],
        [48, 30, 1],
      ].map(([x, y, dir], i) => (
        <path
          key={i}
          d={`M${x} ${y} C${x + 18 * dir} ${y - 6} ${x + 22 * dir} ${y - 20} ${x + 6 * dir} ${y - 24} C${x + 2 * dir} ${y - 14} ${x} ${y - 8} ${x} ${y} Z`}
          fill={color}
          opacity={0.85 - i * 0.12}
        />
      ))}
    </svg>
  );
}

export function Daisy({ className, petal = '#FFFFFF', center = palette.butter[400] }: { className?: string; petal?: string; center?: string }) {
  return (
    <svg viewBox="0 0 60 60" className={className} aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <ellipse key={i} cx="30" cy="14" rx="7" ry="13" fill={petal} transform={`rotate(${i * 45} 30 30)`} />
      ))}
      <circle cx="30" cy="30" r="8" fill={center} />
    </svg>
  );
}

export function SparkleShape({ className, color = palette.butter[400] }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 0 C13 7 17 11 24 12 C17 13 13 17 12 24 C11 17 7 13 0 12 C7 11 11 7 12 0 Z" fill={color} />
    </svg>
  );
}

export function Squiggle({ className, color = palette.green[500] }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 160 20" className={className} aria-hidden fill="none">
      <path d="M2 12 C 20 2, 30 18, 50 10 S 80 2, 100 10 S 135 18, 158 6" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
