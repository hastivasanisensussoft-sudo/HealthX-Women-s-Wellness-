/**
 * Let a mouse wheel scroll horizontal rows (tab strips, filter chips, card carousels).
 * The rows hide their scrollbar (`no-scrollbar`, `snap-row`), so a desktop mouse could not move
 * them. When the pointer is over a horizontally scrollable element, a vertical wheel scrolls it
 * sideways; at either end the wheel falls through to the page. Trackpad sideways swipes and
 * touch are untouched. Snapping rows move one card per wheel gesture so they don't snap back.
 */
const lastStep = new WeakMap<HTMLElement, number>();

function horizontalScroller(start: EventTarget | null): HTMLElement | null {
  for (let el = start instanceof HTMLElement ? start : null; el && el !== document.body; el = el.parentElement) {
    const s = getComputedStyle(el);
    // overflow-x:auto also computes overflow-y to auto, so judge by content size, not the style alone
    const scrollsX = /(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1;
    const scrollsY = /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1;
    if (scrollsX && !scrollsY) return el;
    if (scrollsY) return null;
  }
  return null;
}

export function installHorizontalWheel(): () => void {
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
    const el = horizontalScroller(e.target);
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    if ((step > 0 && el.scrollLeft >= max - 1) || (step < 0 && el.scrollLeft <= 0)) return;
    e.preventDefault();
    if (/mandatory/.test(getComputedStyle(el).scrollSnapType)) {
      const now = Date.now();
      if (now - (lastStep.get(el) ?? 0) < 350) return;
      lastStep.set(el, now);
      const card = (el.firstElementChild as HTMLElement | null)?.getBoundingClientRect().width ?? el.clientWidth * 0.8;
      el.scrollBy({ left: Math.sign(step) * card, behavior: 'smooth' });
      return;
    }
    el.scrollLeft += step;
  };
  document.addEventListener('wheel', onWheel, { passive: false, capture: true });
  return () => document.removeEventListener('wheel', onWheel, { capture: true });
}
