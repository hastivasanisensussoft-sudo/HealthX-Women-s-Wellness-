import type { ReactNode } from 'react';
import type { PhotoKey } from '@healthx/shared';
import { LeafPair } from '@/components/brand/Brand';
import { Photo } from '@/components/media/Photo';
import { cn } from '@/lib/utils';

/** Arch-framed photo with the pink + white leaf pair behind it (Mira / Balanza reference). */
export function ArchPortrait({
  photo,
  src,
  alt,
  className,
  position,
  leafClassName = '-left-8 -top-6 h-32 w-32',
  ring = 'ring-[6px] ring-white',
  priority,
  children,
}: {
  photo?: PhotoKey;
  src?: string;
  alt: string;
  className?: string;
  position?: string;
  leafClassName?: string;
  ring?: string;
  priority?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={cn('relative', className)}>
      <LeafPair className={leafClassName} />
      <Photo photo={photo} src={src} alt={alt} shape="arch" position={position} priority={priority} className={cn('relative h-full w-full shadow-lift', ring)} />
      {children}
    </div>
  );
}
