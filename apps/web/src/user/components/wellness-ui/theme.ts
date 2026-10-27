/**
 * Theme-aware colour for SVG attributes and props that take a colour string (e.g. `<Leaf color>`):
 * reads the palette CSS variable (`--c-*` for fills/strokes, `--t-*` for text) and falls back to
 * the static palette value, so accent themes and dark mode recolour it.
 */
export function themeColor(token: string, hex: string, kind: 'c' | 't' = 'c', alpha?: number): string {
  const n = parseInt(hex.slice(1), 16);
  const rgb = `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
  return `rgb(var(--${kind}-${token}, ${rgb})${alpha === undefined ? '' : ` / ${alpha}`})`;
}
