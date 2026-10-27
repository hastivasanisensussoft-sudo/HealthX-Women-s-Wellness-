/** React Native wrapper for the small SVG art in lib/art.ts (react-native-svg `SvgXml`). */
import { memo, useMemo, useState } from 'react';
import { SvgXml } from 'react-native-svg';

import { scopeIds } from '@/lib/art';

let nextScope = 0;
/** A stable, per-instance id suffix so gradients in different SVGs never collide on the web. */
function useScope() {
  const [scope] = useState(() => `a${++nextScope}`);
  return scope;
}

/** Any art SVG string. `cover` fills the box like a cover image, cropping evenly. Decorative. */
export const Art = memo(function Art({ svg, width, height, cover }: { svg: string; width: number | `${number}%`; height: number | `${number}%`; cover?: boolean }) {
  const scope = useScope();
  const xml = useMemo(() => {
    const scoped = scopeIds(svg, scope);
    return cover ? scoped.replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ') : scoped;
  }, [svg, cover, scope]);
  return <SvgXml xml={xml} width={width} height={height} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
});
