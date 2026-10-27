import { useState, type CSSProperties, type ReactNode } from 'react';
import { ImageOff } from 'lucide-react';
import type { PhotoKey } from '@healthx/shared';
import { photo as photoUrl } from '@/lib/photos';
import { cn } from '@/lib/utils';

export type PhotoShape = 'rounded' | 'arch' | 'circle' | 'blob' | 'none';

const SHAPES: Record<PhotoShape, string> = {
  rounded: 'rounded-2xl',
  arch: 'arch',
  circle: 'rounded-full',
  blob: 'blob',
  none: '',
};

/**
 * Photo with a soft placeholder, a fade-in on load and a graceful fallback when the
 * image can't load (mint panel with the alt text). Pass `alt=""` for decorative photos.
 */
export function Photo({
  photo,
  src,
  alt,
  shape = 'rounded',
  className,
  imgClassName,
  priority,
  kenBurns,
  position,
  children,
  style,
}: {
  photo?: PhotoKey;
  src?: string;
  alt: string;
  shape?: PhotoShape;
  className?: string;
  imgClassName?: string;
  /** Above-the-fold images load eagerly. */
  priority?: boolean;
  /** Slow zoom (hero and video posters). */
  kenBurns?: boolean;
  /** object-position, e.g. "50% 20%" to keep faces in frame. */
  position?: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const url = src ?? photoUrl(photo);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>(url ? 'loading' : 'error');
  return (
    <div className={cn('relative isolate overflow-hidden bg-gradient-to-br from-green-100 via-mint to-rose-50', SHAPES[shape], className)} style={style}>
      {url && state !== 'error' && (
        <img
          src={url}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setState('ok')}
          onError={() => setState('error')}
          className={cn('h-full w-full object-cover transition-opacity duration-700', state === 'ok' ? 'opacity-100' : 'opacity-0', kenBurns && 'animate-ken-burns', imgClassName)}
          style={position ? { objectPosition: position } : undefined}
        />
      )}
      {state === 'error' && (
        <div role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-green-700">
          <span aria-hidden className="leaf absolute right-[18%] top-[16%] h-10 w-10 bg-rose-100" />
          <span aria-hidden className="leaf-alt absolute bottom-[18%] left-[14%] h-8 w-8 bg-white/70" />
          <ImageOff className="relative h-6 w-6 opacity-70" />
          {alt && <span className="relative max-w-[90%] text-xs font-medium text-green-800/80">{alt}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
