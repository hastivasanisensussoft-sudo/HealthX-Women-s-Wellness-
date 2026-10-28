/**
 * Web only: let a mouse wheel scroll horizontal lists (carousels, chip rows).
 * Browsers only scroll a horizontal-only list with a horizontal wheel/trackpad gesture, and the
 * lists hide their scrollbar, so desktop mouse users could not move them at all. When the pointer
 * is over a horizontally scrollable element, a vertical wheel scrolls it sideways; at either end
 * the wheel falls through to the page as usual. Touch and trackpad sideways swipes are untouched.
 */
import { Platform } from 'react-native';

const lastPage = new WeakMap<HTMLElement, number>();

function horizontalScroller(start: EventTarget | null): HTMLElement | null {
  for (let el = start instanceof HTMLElement ? start : null; el && el !== document.body; el = el.parentElement) {
    const s = getComputedStyle(el);
    const scrollsX = /(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1;
    const scrollsY = /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1;
    if (scrollsY) return null; // inside a vertical scroller first: leave the wheel to it
    if (scrollsX) return el;
  }
  return null;
}

/** Installs the listener once; returns a cleanup function. */
export function installHorizontalWheel(): () => void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return () => {};
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return; // zoom or a real sideways gesture
    const el = horizontalScroller(e.target);
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY; // lines → px
    if ((step > 0 && el.scrollLeft >= max - 1) || (step < 0 && el.scrollLeft <= 0)) return; // at an end: scroll the page
    e.preventDefault();
    if (/mandatory/.test(getComputedStyle(el).scrollSnapType)) {
      // paged list (e.g. welcome slides): small steps would snap back, so move one page per gesture
      const now = Date.now();
      if (now - (lastPage.get(el) ?? 0) < 450) return;
      lastPage.set(el, now);
      el.scrollBy({ left: Math.sign(step) * el.clientWidth, behavior: 'smooth' });
      return;
    }
    el.scrollLeft += step;
  };
  document.addEventListener('wheel', onWheel, { passive: false, capture: true });
  return () => document.removeEventListener('wheel', onWheel, { capture: true });
}
