/**
 * Small hand-built SVG art (no external images): builders return SVG strings for react-native-svg
 * `SvgXml` via components/Illustration. Characters and scenes are pictures now (see lib/pictures).
 */

/**
 * Makes gradient and clip-path ids unique per rendered SVG. On the web every inline SVG shares one
 * document, so two drawings that both define `id="wave"` would otherwise paint with whichever came first.
 */
export const scopeIds = (svg: string, scope: string) => svg.replace(/id="([^"]+)"/g, `id="$1-${scope}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${scope})`);

/**
 * The ring centre on the Today screen: a soft disc filled with a gentle wave up to `level` (0–1,
 * how far through the estimated cycle today is) and a drop in front. Decorative.
 */
export function dropFillSvg(level: number): string {
  const y = 92 - Math.max(0.08, Math.min(1, level)) * 80;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs><clipPath id="disc"><circle cx="50" cy="50" r="46"/></clipPath>
  <linearGradient id="wave" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F59DB4"/><stop offset="1" stop-color="#E25D80"/></linearGradient></defs>
  <circle cx="50" cy="50" r="46" fill="#FFF1F4"/>
  <g clip-path="url(#disc)">
    <path d="M0 ${y} C14 ${y - 5} 26 ${y + 5} 40 ${y} C54 ${y - 5} 66 ${y + 5} 80 ${y} C88 ${y - 3} 94 ${y + 2} 100 ${y} L100 100 L0 100 Z" fill="url(#wave)" opacity="0.85"/>
    <path d="M0 ${y + 4} C16 ${y} 30 ${y + 8} 46 ${y + 4} C62 ${y} 78 ${y + 8} 100 ${y + 3}" stroke="#FFFFFF" stroke-width="1.6" fill="none" opacity="0.5"/>
    ${[[24, y + 16, 2.2], [70, y + 22, 1.6], [58, y + 34, 2.6], [34, y + 30, 1.4]].map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" opacity="0.55"/>`).join('')}
  </g>
  <path d="M50 18 C60 32 68 42 68 53 C68 64 60 71 50 71 C40 71 32 64 32 53 C32 42 40 32 50 18 Z" fill="#E7486F" stroke="#FFFFFF" stroke-width="2.5"/>
  <path d="M41 52 C41 58 44 62 49 63" stroke="#FFFFFF" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.8"/>
  <circle cx="50" cy="50" r="46" fill="none" stroke="#FBD3DD" stroke-width="2"/>
</svg>`;
}
