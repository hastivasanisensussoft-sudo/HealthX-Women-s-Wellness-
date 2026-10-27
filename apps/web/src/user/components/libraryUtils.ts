import { CONTENT_CATEGORIES, LIBRARY_DURATIONS, LIBRARY_MEDIA, QUICK_HELP, type Article } from '@healthx/shared';

/** Library helpers (formats, filters) shared by the Library, FAQ and article pages. */
export type Medium = (typeof LIBRARY_MEDIA)[number]['key'];

/** Library format of a content item: audio (podcast), video, or something to read. */
export const mediumOf = (a: Article): Medium => (a.type === 'podcast' ? 'audio' : a.type === 'video' ? 'video' : 'article');
export const isPlayable = (a: Article) => mediumOf(a) !== 'article';
export const isQuickHelp = (a: Article) => !!a.tags?.includes(QUICK_HELP);
export const categoryLabel = (a: Article) => CONTENT_CATEGORIES.find((c) => c.key === a.category)?.label ?? a.topic;


export const durationLabel = (a: Article) => `${a.readMin} min${mediumOf(a) === 'article' ? ' read' : mediumOf(a) === 'audio' ? ' listen' : ' watch'}`;

export interface LibraryFilter {
  favorites: boolean;
  medium: Medium | null;
  duration: string | null;
}
export const EMPTY_FILTER: LibraryFilter = { favorites: false, medium: null, duration: null };

export function applyLibraryFilter(items: Article[], f: LibraryFilter, bookmarks: string[]) {
  const d = LIBRARY_DURATIONS.find((x) => x.key === f.duration);
  return items.filter((a) => (!f.favorites || bookmarks.includes(a.id)) && (!f.medium || mediumOf(a) === f.medium) && (!d || (a.readMin >= d.min && a.readMin <= d.max)));
}
